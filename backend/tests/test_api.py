import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.adapters.outbound.simulated_ai import AMBIGUOUS, ROUTINE, URGENT
from app.domain.triaje import Destination, Extraction, Priority, Status, decide
from app.infrastructure.bootstrap import create_app
from app.infrastructure.settings import Settings


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(Settings(_env_file=None, storage_dir=tmp_path))) as client:
        yield client


def payload(text=ROUTINE, document_id="DOC-1"):
    return {
        "documento_id": document_id,
        "canal_origen": "pruebas",
        "documento_texto": text,
        "tipo_archivo": "TEXTO",
    }


@pytest.mark.parametrize(
    "text,status,destination,alert",
    [
        (ROUTINE, "PROCESSED", "HISTORIA_CLINICA", False),
        (URGENT, "PROCESSED", "EMERGENCIA_MEDICA", True),
        (AMBIGUOUS, "NEEDS_AUDIT", "REVISION_HUMANA", False),
    ],
)
def test_scenarios_and_original_document(client, text, status, destination, alert):
    response = client.post("/api/v1/triajes", json=payload(text))
    assert response.status_code == 201
    result = response.json()
    assert result["status"] == status
    assert result["decision_enrutamiento"]["destino_principal"] == destination
    assert result["decision_enrutamiento"]["alerta_urgente"] == alert
    assert result["almacenamiento_oci"] is None
    assert result["modo_ia"] == "simulado"
    assert client.get("/api/v1/triajes/DOC-1").json() == result
    assert client.get("/api/v1/triajes/DOC-1/documento").content == text.encode()


def test_unknown_text_is_not_invented(client):
    result = client.post("/api/v1/triajes/process-text", json=payload("Texto desconocido")).json()
    assert result["status"] == "NEEDS_AUDIT"
    assert result["datos_extraidos"]["paciente"]["nombre"] is None
    assert result["audit_reasons"] == ["AI_UNAVAILABLE"]


def test_queue_filters_and_pagination(client):
    for index, text in enumerate([ROUTINE, URGENT, AMBIGUOUS]):
        client.post("/api/v1/triajes", json=payload(text, f"DOC-{index}"))
    result = client.get("/api/v1/triajes?limit=1&offset=1").json()
    assert result["total"] == 3
    assert len(result["items"]) == 1
    queue = client.get("/api/v1/audit/queue").json()
    assert queue["total"] == 1
    assert queue["items"][0]["documento_id"] == "DOC-2"
    assert client.get("/api/v1/triajes?destino=EMERGENCIA_MEDICA").json()["total"] == 1
    assert client.get("/api/v1/triajes?status=PROCESSED").json()["total"] == 2


@pytest.mark.parametrize(
    "change",
    [
        {"documento_texto": "   "},
        {"documento_texto": ""},
        {"documento_id": "../oops"},
        {"canal_origen": " "},
        {"tipo_archivo": "EXE"},
        {"extra": "invalid"},
    ],
)
def test_invalid_input(client, change):
    assert client.post("/api/v1/triajes", json=payload() | change).status_code == 422
    assert client.get("/api/v1/triajes").json()["total"] == 0


def test_duplicate_does_not_overwrite(client):
    assert client.post("/api/v1/triajes", json=payload()).status_code == 201
    assert client.post("/api/v1/triajes", json=payload(URGENT)).status_code == 409
    assert client.get("/api/v1/triajes/DOC-1/documento").content == ROUTINE.encode()


def test_concurrent_duplicate(client):
    with ThreadPoolExecutor(max_workers=2) as executor:
        codes = list(
            executor.map(
                lambda _: client.post("/api/v1/triajes", json=payload()).status_code, range(2)
            )
        )
    assert sorted(codes) == [201, 409]


@pytest.mark.parametrize("path", ["/api/v1/triajes/MISSING", "/api/v1/triajes/MISSING/documento"])
def test_missing_document(client, path):
    assert client.get(path).status_code == 404


@pytest.mark.parametrize("route", ["archivo", "process-file"])
def test_file_ingestion_without_fake_ocr(client, route):
    content = b"%PDF-1.7\nsynthetic upload validation fixture"
    result = client.post(
        f"/api/v1/triajes/{route}",
        data={"documento_id": "PDF-1", "canal_origen": "pruebas"},
        files={"archivo": ("../../ignore.pdf", content, "application/pdf")},
    )
    assert result.status_code == 201
    assert result.json()["status"] == "NEEDS_AUDIT"
    assert result.json()["audit_reasons"] == ["AI_UNAVAILABLE"]
    assert client.get("/api/v1/triajes/PDF-1/documento").content == content


@pytest.mark.parametrize(
    "content,mime", [(b"exe", "application/pdf"), (b"txt", "text/plain"), (b"", "image/png")]
)
def test_invalid_files(client, content, mime):
    assert (
        client.post(
            "/api/v1/triajes/archivo",
            data={"documento_id": "FILE", "canal_origen": "test"},
            files={"archivo": ("file", content, mime)},
        ).status_code
        == 415
    )


def test_upload_size_limit(tmp_path):
    with TestClient(
        create_app(Settings(_env_file=None, storage_dir=tmp_path, max_upload_bytes=5))
    ) as client:
        assert (
            client.post(
                "/api/v1/triajes/archivo",
                data={"documento_id": "FILE", "canal_origen": "test"},
                files={"archivo": ("file.pdf", b"%PDF-123", "application/pdf")},
            ).status_code
            == 413
        )


def test_urgent_with_audit_reason_alerts_without_routing():
    result = decide(
        Extraction(
            "Informe de Laboratorio", Priority.URGENT, 0.2, audit_reasons=("LOW_CONFIDENCE",)
        )
    )
    assert result.status == Status.NEEDS_AUDIT
    assert result.destination == Destination.REVIEW
    assert result.urgent_alert


def test_health_and_openapi(client):
    assert client.get("/health").json()["repositorio"] == "memoria"
    schema = client.get("/openapi.json").json()
    assert "/api/v1/triajes/process-text" in schema["paths"]
    assert "/api/v1/audit/queue" in schema["paths"]


def test_new_application_has_empty_history(tmp_path):
    settings = Settings(_env_file=None, storage_dir=tmp_path)
    with TestClient(create_app(settings)) as first:
        first.post("/api/v1/triajes", json=payload())
    with TestClient(create_app(settings)) as second:
        assert second.get("/api/v1/triajes").json()["total"] == 0


@pytest.mark.parametrize(
    "name,status",
    [
        ("rutina", "PROCESSED"),
        ("urgencia", "PROCESSED"),
        ("ambiguo", "NEEDS_AUDIT"),
    ],
)
def test_documented_json_fixtures(client, name, status):
    path = Path(__file__).resolve().parents[2] / "data" / "functional" / f"{name}.json"
    response = client.post("/api/v1/triajes/process-text", json=json.loads(path.read_text()))
    assert response.status_code == 201
    assert response.json()["status"] == status


def test_storage_failure_does_not_register_document(client, monkeypatch):
    def fail(*args):
        raise OSError("Storage unavailable")

    monkeypatch.setattr(client.app.state.storage, "save", fail)
    with pytest.raises(OSError):
        client.post("/api/v1/triajes", json=payload())
    assert client.get("/api/v1/triajes").json()["total"] == 0
