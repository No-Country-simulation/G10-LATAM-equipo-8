from dataclasses import replace
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.adapters.outbound.persistence_models import Base, DocumentRow, NotificationOutboxRow
from app.adapters.outbound.postgres import PostgresTriageRepository
from app.application.review_document import ReviewDocument
from app.domain.extraction import ProcessingStatus
from app.domain.review import ReviewAction, ReviewConflict
from app.domain.triaje import (
    Destination,
    DocumentNotFound,
    DuplicateDocument,
    Extraction,
    Priority,
    Status,
    Triage,
    decide,
)


def make_triage():
    extraction = Extraction(
        "Receta Medica", Priority.ROUTINE, 0.2, audit_reasons=("LOW_CONFIDENCE",)
    )
    return Triage(
        "TEST",
        "web",
        "text/plain",
        "recibidos/test",
        datetime.now(UTC),
        extraction,
        decide(extraction),
    )


def test_reservation_is_committed_before_storage_and_failure_is_recoverable():
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    repository = PostgresTriageRepository(engine)

    def failed_upload():
        with Session(engine) as session:
            assert session.scalar(select(DocumentRow)).storage_state == "PENDING"
        raise OSError("upload failed")

    with pytest.raises(OSError):
        repository.create(make_triage(), failed_upload)
    with Session(engine) as session:
        assert session.scalar(select(DocumentRow)).storage_state == "FAILED"
    assert repository.list() == []
    repository.create(make_triage(), lambda: None)
    assert repository.get("TEST").document_id == "TEST"
    with pytest.raises(DuplicateDocument):
        repository.create(make_triage(), lambda: None)


def test_review_preserves_original_and_appends_event_atomically():
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    from app.adapters.outbound.persistence_models import TriageRow

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    repository = PostgresTriageRepository(engine)
    repository.create(make_triage(), lambda: None)
    reviewer = ReviewDocument(repository)
    reviewer.execute(
        "TEST",
        ReviewAction.CORRECT_APPROVE,
        "synthetic-reviewer",
        "Synthetic only",
        Destination.PHARMACY,
        {"patient_name": "Demo"},
    )
    assert repository.get("TEST").decision.status == Status.APPROVED
    assert len(repository.reviews("TEST")) == 1
    with Session(engine) as session:
        row = session.scalar(select(TriageRow))
        assert row.extraction_original["patient_name"] is None
        assert row.extraction_current["patient_name"] == "Demo"
        assert row.version == 2
    with pytest.raises(ReviewConflict):
        reviewer.execute("TEST", ReviewAction.REJECT, "synthetic-reviewer", "Repeated", None, {})


def test_failed_audit_insert_rolls_back_status():
    from sqlalchemy import create_engine, event

    from app.adapters.outbound.persistence_models import ReviewRow

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    repository = PostgresTriageRepository(engine)
    repository.create(make_triage(), lambda: None)

    def fail(*args):
        raise RuntimeError("audit unavailable")

    event.listen(ReviewRow, "before_insert", fail)
    try:
        with pytest.raises(RuntimeError):
            ReviewDocument(repository).execute(
                "TEST", ReviewAction.REJECT, "Demo", "Synthetic", None, {}
            )
    finally:
        event.remove(ReviewRow, "before_insert", fail)
    assert repository.get("TEST").decision.status == Status.NEEDS_AUDIT
    assert repository.reviews("TEST") == ()


@pytest.fixture
def repository():
    from sqlalchemy import create_engine

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield PostgresTriageRepository(engine)
    engine.dispose()


def document_snapshot(repository):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    with Session(repository.engine) as session:
        row = session.scalar(select(DocumentRow))
        return {column.name: getattr(row, column.name) for column in DocumentRow.__table__.columns}


def synthetic_triage():
    return replace(
        make_triage(),
        sha256=sha256(b"synthetic").hexdigest(),
        size_bytes=9,
        original_filename="synthetic.txt",
        storage_provider="neon",
        storage_bucket="mediflow-pruebas",
    )


def complete_pending(repository, extraction, error_code=None):
    pending = replace(make_triage(), processing_status=ProcessingStatus.PENDING)
    repository.create(pending, lambda: None)
    token = repository.begin_processing(pending.document_id)
    return repository.finish_processing(pending.document_id, token, extraction, error_code)


@pytest.mark.parametrize(
    ("extraction", "error_code", "expected_error_code"),
    [
        (
            Extraction("Receta Medica", Priority.URGENT, 0.99, "Demo"),
            None,
            None,
        ),
        (
            Extraction(
                "Receta Medica",
                Priority.ROUTINE,
                0.9,
                "Demo",
                audit_reasons=("AMBIGUOUS",),
            ),
            None,
            None,
        ),
        (Extraction(None, None, None), None, None),
        (
            Extraction(None, None, None, audit_reasons=("EXTRACTION_FAILED",)),
            "EXTRACTION_FAILED",
            "EXTRACTION_FAILED",
        ),
    ],
    ids=["urgent", "ambiguous", "incomplete", "technical-error"],
)
def test_needs_audit_persists_one_review_required_outbox_intent(
    repository, extraction, error_code, expected_error_code
):
    from hashlib import sha256

    from sqlalchemy import select
    from sqlalchemy.orm import Session

    result = complete_pending(repository, extraction, error_code)

    assert result.decision.status == Status.NEEDS_AUDIT
    assert result.decision.destination == Destination.REVIEW
    with Session(repository.engine) as session:
        rows = session.scalars(select(NotificationOutboxRow)).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.event_type == "REVIEW_REQUIRED"
        assert row.channel == "SLACK"
        assert row.status == "PENDING"
        assert row.idempotency_key == sha256(b"TEST\x00REVIEW_REQUIRED").hexdigest()
        assert row.idempotency_key != "TEST"
        assert row.triage_id != "TEST"
        assert row.error_code == expected_error_code
        assert row.attempt_count == 0
        assert row.created_at is not None
        assert row.last_attempt_at is None
        assert row.delivered_at is None
        assert row.next_attempt_at is None
        assert not {
            "document_id",
            "payload",
            "patient_name",
            "diagnosis",
            "extraction",
        } & set(NotificationOutboxRow.__table__.columns.keys())


def test_routine_result_does_not_create_notification_outbox_intent(repository):
    from sqlalchemy import func, select
    from sqlalchemy.orm import Session

    result = complete_pending(
        repository,
        Extraction("Receta Medica", Priority.ROUTINE, 0.9, "Demo"),
    )

    assert result.decision.status == Status.PROCESSED
    with Session(repository.engine) as session:
        assert session.scalar(select(func.count()).select_from(NotificationOutboxRow)) == 0


def test_outbox_unique_constraints_reject_duplicate_document_event(repository):
    from sqlalchemy import select
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import Session

    complete_pending(
        repository,
        Extraction("Receta Medica", Priority.ROUTINE, 0.9, "Demo", audit_reasons=("AMBIGUOUS",)),
    )
    with Session(repository.engine) as session:
        original = session.scalar(select(NotificationOutboxRow))

    duplicate = NotificationOutboxRow(
        id="duplicate-intent",
        triage_id=original.triage_id,
        event_type=original.event_type,
        channel=original.channel,
        status=original.status,
        idempotency_key=original.idempotency_key,
        attempt_count=0,
        created_at=original.created_at,
    )
    with Session(repository.engine) as session, pytest.raises(IntegrityError):
        session.add(duplicate)
        session.commit()


def test_review_required_intent_replaces_unrecognized_error_text_with_safe_code():
    from app.domain.notification import review_required_intent

    intent = review_required_intent(
        "SYNTHETIC-DOC-SECRET",
        "triage-reference",
        datetime.now(UTC),
        "synthetic private exception detail",
    )

    assert intent.error_code == "EXTRACTION_FAILED"
    assert intent.idempotency_key != "SYNTHETIC-DOC-SECRET"
    assert "synthetic private exception detail" not in repr(intent)
    assert not hasattr(intent, "document_id")


def test_outbox_insert_failure_rolls_back_triage_finalization(repository):
    from sqlalchemy import event, select
    from sqlalchemy.orm import Session

    from app.adapters.outbound.persistence_models import TriageRow

    pending = replace(make_triage(), processing_status=ProcessingStatus.PENDING)
    repository.create(pending, lambda: None)
    token = repository.begin_processing(pending.document_id)

    def fail(*args):
        raise RuntimeError("synthetic outbox insert failure")

    event.listen(NotificationOutboxRow, "before_insert", fail)
    try:
        with pytest.raises(RuntimeError, match="synthetic outbox insert failure"):
            repository.finish_processing(
                pending.document_id,
                token,
                Extraction("Receta Medica", Priority.URGENT, 0.99, "Demo"),
            )
    finally:
        event.remove(NotificationOutboxRow, "before_insert", fail)

    with Session(repository.engine) as session:
        triage = session.scalar(select(TriageRow))
        assert triage.processing_status == ProcessingStatus.PROCESSING
        assert triage.processing_token == token
        assert session.scalars(select(NotificationOutboxRow)).all() == []


@pytest.mark.parametrize(
    "changes",
    [
        {"media_type": "application/pdf"},
        {"channel": "email"},
        {"original_filename": "other.txt"},
        {"size_bytes": 10},
        {"storage_provider": "local"},
        {"storage_bucket": "other-bucket"},
    ],
)
def test_failed_retry_rejects_changed_metadata_without_storage_or_database_write(
    repository, changes
):
    original = synthetic_triage()
    failed_save = Mock(side_effect=OSError("synthetic upload failure"))
    with pytest.raises(OSError):
        repository.create(original, failed_save)
    before = document_snapshot(repository)
    retry_save = Mock()
    with pytest.raises(DuplicateDocument):
        repository.create(replace(original, object_key="recibidos/retry", **changes), retry_save)
    retry_save.assert_not_called()
    assert document_snapshot(repository) == before
    assert repository.list() == []


def test_identical_failed_retry_preserves_original_metadata_and_timestamp(repository):
    original = synthetic_triage()
    with pytest.raises(OSError):
        repository.create(original, Mock(side_effect=OSError("synthetic upload failure")))
    before = document_snapshot(repository)
    retry_save = Mock()
    repository.create(replace(original, object_key="recibidos/retry"), retry_save)
    retry_save.assert_called_once_with()
    after = document_snapshot(repository)
    for field in (
        "created_at",
        "channel",
        "media_type",
        "original_filename",
        "size_bytes",
        "sha256",
        "provider",
        "bucket",
    ):
        assert after[field] == before[field]
    assert after["object_key"] == "recibidos/retry"
    assert after["storage_state"] == "READY"


NOW = datetime(2026, 10, 6, 12, tzinfo=UTC)


@pytest.fixture
def frozen_clock(monkeypatch):
    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return NOW if tz else NOW.replace(tzinfo=None)

    monkeypatch.setattr("app.adapters.outbound.postgres.datetime", FrozenDatetime)


def set_reservation(repository, *, state="PENDING", age=timedelta(seconds=300), **changes):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    with Session(repository.engine) as session, session.begin():
        row = session.scalar(select(DocumentRow))
        row.storage_state = state
        row.upload_token = "original-token"
        row.updated_at = NOW - age
        for key, value in changes.items():
            setattr(row, key, value)


def storage_fixture(read=None, **changes):
    return SimpleNamespace(
        provider="neon",
        bucket="mediflow-pruebas",
        read=read or Mock(return_value=b"synthetic"),
        **changes,
    )


def test_reconcile_before_five_minutes_does_not_read_or_publish(repository, frozen_clock):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository, age=timedelta(microseconds=299_999_999))
    before = document_snapshot(repository)
    storage = storage_fixture()
    with pytest.raises(ReviewConflict):
        repository.reconcile(storage, "TEST")
    storage.read.assert_not_called()
    assert document_snapshot(repository) == before
    with pytest.raises(DocumentNotFound):
        repository.get("TEST")


def test_reconcile_at_five_minutes_verifies_hash_and_promotes_current_reservation(
    repository, frozen_clock
):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository)
    storage = storage_fixture()
    assert repository.reconcile(storage, "TEST") == "READY"
    storage.read.assert_called_once_with("recibidos/test")
    assert document_snapshot(repository)["upload_token"] is None
    assert repository.get("TEST").sha256 == sha256(b"synthetic").hexdigest()


@pytest.mark.parametrize("field,value", [("provider", "local"), ("bucket", "wrong-bucket")])
def test_reconcile_rejects_mismatched_storage_before_read(repository, frozen_clock, field, value):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository)
    before = document_snapshot(repository)
    storage = storage_fixture()
    setattr(storage, field, value)
    with pytest.raises(ReviewConflict):
        repository.reconcile(storage, "TEST")
    storage.read.assert_not_called()
    assert document_snapshot(repository) == before


@pytest.mark.parametrize(
    "read",
    [
        Mock(return_value=b"wrong content"),
        Mock(side_effect=OSError("synthetic unreadable object")),
        Mock(side_effect=FileNotFoundError("synthetic missing object")),
    ],
)
def test_bad_or_unreadable_original_remains_hidden(repository, frozen_clock, read):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository)
    before = document_snapshot(repository)
    with pytest.raises((ReviewConflict, OSError)):
        repository.reconcile(storage_fixture(read), "TEST")
    assert document_snapshot(repository) == before
    assert repository.list() == []


@pytest.mark.parametrize(
    "changes",
    [
        {"upload_token": "replacement-token"},
        {"object_key": "recibidos/replacement"},
        {"storage_state": "FAILED"},
        {"sha256": "0" * 64},
        {"provider": "local"},
        {"bucket": "other-bucket"},
    ],
)
def test_reconcile_cannot_overwrite_reservation_changed_during_read(
    repository, frozen_clock, changes
):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository)
    expected = {}

    def read(key):
        with Session(repository.engine) as session, session.begin():
            row = session.scalar(select(DocumentRow))
            for field, value in changes.items():
                setattr(row, field, value)
        expected.update(document_snapshot(repository))
        return b"synthetic"

    with pytest.raises(ReviewConflict):
        repository.reconcile(storage_fixture(read), "TEST")
    assert document_snapshot(repository) == expected
    assert repository.list() == []


@pytest.mark.parametrize(
    "state,age",
    [
        ("PENDING", timedelta(microseconds=299_999_999)),
        ("READY", timedelta(seconds=300)),
        ("FAILED", timedelta(seconds=300)),
    ],
)
def test_release_rejects_fresh_or_nonpending_reservation(repository, frozen_clock, state, age):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository, state=state, age=age)
    before = document_snapshot(repository)
    with pytest.raises(ReviewConflict):
        repository.release_stale("TEST")
    assert document_snapshot(repository) == before


def test_release_at_five_minutes_revokes_old_token_and_preserves_metadata(repository, frozen_clock):
    repository.create(synthetic_triage(), lambda: None)
    set_reservation(repository)
    before = document_snapshot(repository)
    repository.release_stale("TEST")
    after = document_snapshot(repository)
    assert after["storage_state"] == "FAILED"
    assert after["upload_token"] is None
    for field in (
        "object_key",
        "sha256",
        "provider",
        "bucket",
        "channel",
        "media_type",
        "original_filename",
    ):
        assert before[field] == after[field]
    with pytest.raises(DuplicateDocument):
        repository._finish_upload("TEST", "original-token", "READY")
    assert document_snapshot(repository) == after
