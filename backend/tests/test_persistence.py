from datetime import UTC, datetime

import pytest

from app.adapters.outbound.persistence_models import Base, DocumentRow
from app.adapters.outbound.postgres import PostgresTriageRepository
from app.application.review_document import ReviewDocument
from app.domain.review import ReviewAction, ReviewConflict
from app.domain.triaje import (
    Destination,
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
