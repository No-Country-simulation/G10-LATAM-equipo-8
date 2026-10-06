from dataclasses import replace
from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from sqlalchemy import create_engine

from app.adapters.outbound.local_storage import LocalDocumentStorage
from app.adapters.outbound.memory import MemoryTriageRepository
from app.adapters.outbound.persistence_models import Base
from app.adapters.outbound.postgres import PostgresTriageRepository
from app.application.process_document import ProcessDocument
from app.application.review_document import ReviewDocument
from app.domain.extraction import ProcessingStatus
from app.domain.review import InvalidReview, ReviewAction, ReviewConflict
from app.domain.triaje import Destination, Extraction, Priority, Status


@pytest.fixture(params=["memory", "sql"])
def repository(request):
    if request.param == "memory":
        yield MemoryTriageRepository()
    else:
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        yield PostgresTriageRepository(engine)
        engine.dispose()


def test_original_is_available_before_extractor_is_called(repository, tmp_path):
    storage = LocalDocumentStorage(tmp_path)
    extractor = Mock()

    def extract(content, media_type):
        saved = repository.get("FIRST")
        if hasattr(repository, "engine"):
            saved = PostgresTriageRepository(repository.engine).get("FIRST")
        assert storage.read(saved.object_key) == b"synthetic"
        assert saved.processing_status == ProcessingStatus.PROCESSING
        assert saved.extraction.confidence is None
        return Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.8, "Demo")

    extractor.extract.side_effect = extract
    result = ProcessDocument(extractor, repository, storage).execute(
        "FIRST", "web", b"synthetic", "text/plain"
    )
    assert result.processing_status == ProcessingStatus.SUCCEEDED


def test_extractor_failure_keeps_original_without_fabricated_confidence(repository, tmp_path):
    storage = LocalDocumentStorage(tmp_path)
    extractor = Mock()
    extractor.extract.side_effect = RuntimeError("SECRET fake upstream response")
    result = ProcessDocument(extractor, repository, storage).execute(
        "FAILURE", "web", b"synthetic", "text/plain"
    )
    assert result.processing_status == ProcessingStatus.FAILED
    assert result.processing_error == "EXTRACTION_FAILED"
    assert result.extraction.confidence is None
    assert result.decision.status == Status.NEEDS_AUDIT
    assert storage.read(repository.get("FAILURE").object_key) == b"synthetic"
    if hasattr(repository, "engine"):
        assert (
            PostgresTriageRepository(repository.engine).get("FAILURE").processing_error
            == "EXTRACTION_FAILED"
        )


def test_interrupted_extractor_retains_visible_processing_record(repository, tmp_path):
    storage = LocalDocumentStorage(tmp_path)
    extractor = Mock()
    extractor.extract.side_effect = KeyboardInterrupt()
    with pytest.raises(KeyboardInterrupt):
        ProcessDocument(extractor, repository, storage).execute(
            "INTERRUPTED", "web", b"synthetic", "text/plain"
        )
    saved = repository.get("INTERRUPTED")
    assert saved.processing_status == ProcessingStatus.PROCESSING
    assert storage.read(saved.object_key) == b"synthetic"


def interrupted_case(repository, tmp_path):
    storage = LocalDocumentStorage(tmp_path)
    extractor = Mock()
    extractor.extract.side_effect = KeyboardInterrupt()
    with pytest.raises(KeyboardInterrupt):
        ProcessDocument(extractor, repository, storage).execute(
            "CLAIM", "web", b"synthetic", "text/plain"
        )
    return storage


def test_pending_processing_cannot_be_human_reviewed(repository, tmp_path):
    interrupted_case(repository, tmp_path)
    with pytest.raises(ReviewConflict):
        ReviewDocument(repository).execute(
            "CLAIM", ReviewAction.REJECT, "Demo", "Synthetic", None, {}
        )


def test_processing_token_rejects_other_workers_and_double_finalization(repository, tmp_path):
    interrupted_case(repository, tmp_path)
    if hasattr(repository, "engine"):
        from sqlalchemy import select
        from sqlalchemy.orm import Session

        from app.adapters.outbound.persistence_models import TriageRow

        with Session(repository.engine) as session:
            token = session.scalar(select(TriageRow)).processing_token
    else:
        token = repository._processing["CLAIM"][0]
    result = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.8, "Demo")
    with pytest.raises(ReviewConflict):
        repository.finish_processing("CLAIM", "wrong-token", result)
    saved = repository.finish_processing("CLAIM", token, result)
    assert saved.processing_status == ProcessingStatus.SUCCEEDED
    with pytest.raises(ReviewConflict):
        repository.finish_processing("CLAIM", token, replace(result, patient_name="Other"))
    assert repository.get("CLAIM").extraction.patient_name == "Demo"


def test_explicit_stale_takeover_revokes_old_processing_token(repository, tmp_path):
    interrupted_case(repository, tmp_path)
    if hasattr(repository, "engine"):
        from sqlalchemy import select
        from sqlalchemy.orm import Session

        from app.adapters.outbound.persistence_models import TriageRow

        with Session(repository.engine) as session, session.begin():
            row = session.scalar(select(TriageRow))
            token = row.processing_token
            row.processing_lease_until = datetime.now(UTC) - timedelta(seconds=1)
    else:
        token = repository._processing["CLAIM"][0]
        repository._processing["CLAIM"] = (token, datetime.now(UTC) - timedelta(seconds=1))
    with pytest.raises(ReviewConflict):
        repository.begin_processing("CLAIM", previous_token="wrong-token")
    replacement = repository.begin_processing("CLAIM", previous_token=token)
    assert replacement != token
    result = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.8, "Demo")
    with pytest.raises(ReviewConflict):
        repository.finish_processing("CLAIM", token, result)
    assert (
        repository.finish_processing("CLAIM", replacement, result).processing_status
        == ProcessingStatus.SUCCEEDED
    )


def test_failure_review_cannot_approve_unknown_priority(repository, tmp_path):
    extractor = Mock()
    extractor.extract.side_effect = RuntimeError("upstream")
    ProcessDocument(extractor, repository, LocalDocumentStorage(tmp_path)).execute(
        "FAILED-REVIEW", "web", b"synthetic", "text/plain"
    )
    reviewer = ReviewDocument(repository)
    with pytest.raises(InvalidReview):
        reviewer.execute(
            "FAILED-REVIEW",
            ReviewAction.CORRECT_APPROVE,
            "Demo",
            "Synthetic",
            Destination.HISTORY,
            {"patient_name": "Demo", "document_type": "Informe de Laboratorio"},
        )
    approved = reviewer.execute(
        "FAILED-REVIEW",
        ReviewAction.CORRECT_APPROVE,
        "Demo",
        "Synthetic",
        Destination.HISTORY,
        {
            "patient_name": "Demo",
            "document_type": "Informe de Laboratorio",
            "priority": Priority.ROUTINE,
        },
    )
    assert approved.extraction.confidence is None
    assert approved.processing_status == ProcessingStatus.FAILED


def test_http_failure_original_and_null_safe_review_audit(tmp_path):
    from fastapi.testclient import TestClient

    from app.infrastructure.bootstrap import create_app
    from app.infrastructure.settings import Settings

    app = create_app(Settings(_env_file=None, storage_dir=tmp_path))
    app.state.processor.extractor = Mock()
    app.state.processor.extractor.extract.side_effect = RuntimeError("SECRET fake provider details")
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/triajes",
            json={
                "documento_id": "HTTP-FAILURE",
                "canal_origen": "web",
                "documento_texto": "synthetic",
            },
        )
        assert response.status_code == 201
        assert "SECRET" not in response.text
        assert response.json()["processing_status"] == "FAILED"
        assert response.json()["clasificacion"]["score_confianza_clasificacion"] is None
        assert client.get("/api/v1/triajes/HTTP-FAILURE/documento").content == b"synthetic"
        assert (
            client.post(
                "/api/v1/triajes/HTTP-FAILURE/revision",
                json={"accion": "rechazar", "revisor": "Demo", "comentario": "Synthetic only"},
            ).status_code
            == 200
        )
        events = client.get("/api/v1/triajes/HTTP-FAILURE/revisiones")
        assert events.status_code == 200
        assert events.json()[0]["before"]["confidence"] is None
