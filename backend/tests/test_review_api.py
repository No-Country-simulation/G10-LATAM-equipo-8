from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.adapters.outbound.simulated_ai import AMBIGUOUS, LOW_CONFIDENCE, ROUTINE
from app.infrastructure.bootstrap import create_app
from app.infrastructure.settings import Settings


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(Settings(_env_file=None, storage_dir=tmp_path))) as client:
        yield client


def create(client, text=LOW_CONFIDENCE, document_id="REVIEW-1"):
    response = client.post(
        "/api/v1/triajes",
        json={
            "documento_id": document_id,
            "canal_origen": "demo",
            "documento_texto": text,
        },
    )
    assert response.status_code == 201
    return response.json()


def review_payload():
    return {
        "accion": "aprobar",
        "revisor": "auditor-demo",
        "comentario": "Revision manual del documento sintetico",
        "destino": "HISTORIA_CLINICA",
    }


def test_approve_queue_filters_and_audit(client):
    original = create(client)
    result = client.post("/api/v1/triajes/REVIEW-1/revision", json=review_payload())
    assert result.status_code == 200
    approved = result.json()
    assert approved["status"] == "APPROVED"
    assert not approved["decision_enrutamiento"]["requiere_auditoria_humana"]
    assert approved["audit_reasons"] == ["LOW_CONFIDENCE"]
    assert approved["clasificacion"] == original["clasificacion"]
    assert client.get("/api/v1/audit/queue").json()["total"] == 0
    assert client.get("/api/v1/triajes?status=APPROVED").json()["total"] == 1
    assert client.get("/api/v1/triajes/REVIEW-1").json() == approved
    events = client.get("/api/v1/triajes/REVIEW-1/revisiones").json()
    assert len(events) == 1
    event = events[0]
    assert event["reviewer"] == "auditor-demo"
    assert event["previous_status"] == "NEEDS_AUDIT"
    assert event["new_status"] == "APPROVED"
    assert event["before"]["confidence"] == event["after"]["confidence"] == 0.2
    assert event["corrections"] == []


def test_correct_and_approve_preserves_original_document(client):
    create(client, AMBIGUOUS)
    result = client.post(
        "/api/v1/triajes/REVIEW-1/revision",
        json=review_payload()
        | {
            "accion": "corregir_aprobar",
            "destino": "FARMACIA",
            "correcciones": {"nombre_paciente": "Ana Demo", "edad_paciente": 30},
        },
    )
    assert result.status_code == 200
    assert result.json()["datos_extraidos"]["paciente"] == {"nombre": "Ana Demo", "edad": 30}
    assert result.json()["clasificacion"]["score_confianza_clasificacion"] == 0.2
    assert client.get("/api/v1/triajes/REVIEW-1/documento").content == AMBIGUOUS.encode()
    event = client.get("/api/v1/triajes/REVIEW-1/revisiones").json()[0]
    assert event["before"]["patient_name"] is None
    assert event["after"]["patient_name"] == "Ana Demo"
    assert len(event["corrections"]) == 2
    assert event["new_destination"] == "FARMACIA"


def test_reject_and_repeat_conflict(client):
    create(client, AMBIGUOUS)
    rejection = {"accion": "rechazar", "revisor": "demo", "comentario": "No legible"}
    result = client.post("/api/v1/triajes/REVIEW-1/revision", json=rejection)
    assert result.status_code == 200
    assert result.json()["status"] == "REJECTED"
    assert result.json()["decision_enrutamiento"]["destino_principal"] == "REVISION_HUMANA"
    assert client.get("/api/v1/audit/queue").json()["total"] == 0
    assert client.post("/api/v1/triajes/REVIEW-1/revision", json=rejection).status_code == 409
    assert len(client.get("/api/v1/triajes/REVIEW-1/revisiones").json()) == 1


def test_concurrent_review_commits_only_one_event(client):
    create(client)
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(
            executor.map(
                lambda _: (
                    client.post(
                        "/api/v1/triajes/REVIEW-1/revision",
                        json=review_payload(),
                    ).status_code
                ),
                range(2),
            )
        )
    assert sorted(responses) == [200, 409]
    assert len(client.get("/api/v1/triajes/REVIEW-1/revisiones").json()) == 1


@pytest.mark.parametrize(
    "change",
    [
        {"accion": "invalid"},
        {"revisor": " "},
        {"comentario": ""},
        {"destino": None},
        {"destino": "REVISION_HUMANA"},
        {"destino": "invalid"},
        {"extra": "invalid"},
        {"correcciones": {"nombre_paciente": "Ana"}},
        {"accion": "rechazar"},
        {"accion": "corregir_aprobar", "correcciones": {}},
        {"accion": "corregir_aprobar", "correcciones": {"edad_paciente": 40}},
        {"accion": "corregir_aprobar", "correcciones": {"edad_paciente": True}},
        {"accion": "corregir_aprobar", "correcciones": {"nombre_paciente": None}},
        {"accion": "corregir_aprobar", "correcciones": {"score": 1.0}},
    ],
)
def test_invalid_review_is_atomic(client, change):
    original = create(client)
    assert (
        client.post("/api/v1/triajes/REVIEW-1/revision", json=review_payload() | change).status_code
        == 422
    )
    assert client.get("/api/v1/triajes/REVIEW-1").json() == original
    assert client.get("/api/v1/triajes/REVIEW-1/revisiones").json() == []


def test_missing_patient_cannot_be_approved_without_correction(client):
    create(client, AMBIGUOUS)
    assert (
        client.post("/api/v1/triajes/REVIEW-1/revision", json=review_payload()).status_code == 422
    )


def test_processed_document_cannot_be_reviewed(client):
    create(client, ROUTINE)
    assert (
        client.post("/api/v1/triajes/REVIEW-1/revision", json=review_payload()).status_code == 409
    )
    assert client.get("/api/v1/triajes/REVIEW-1/revisiones").json() == []


def test_missing_document(client):
    assert client.post("/api/v1/triajes/MISSING/revision", json=review_payload()).status_code == 404
    assert client.get("/api/v1/triajes/MISSING/revisiones").status_code == 404


def test_reviews_are_lost_on_restart(tmp_path):
    settings = Settings(_env_file=None, storage_dir=tmp_path)
    with TestClient(create_app(settings)) as first:
        create(first)
        first.post("/api/v1/triajes/REVIEW-1/revision", json=review_payload())
    with TestClient(create_app(settings)) as second:
        assert second.get("/api/v1/triajes/REVIEW-1/revisiones").status_code == 404
