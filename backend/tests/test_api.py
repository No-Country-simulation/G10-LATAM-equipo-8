import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from pathlib import Path
from unittest.mock import Mock

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
        (URGENT, "NEEDS_AUDIT", "REVISION_HUMANA", True),
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
    assert queue["total"] == 2
    assert {item["documento_id"] for item in queue["items"]} == {"DOC-1", "DOC-2"}
    assert client.get("/api/v1/triajes?destino=EMERGENCIA_MEDICA").json()["total"] == 0
    assert client.get("/api/v1/triajes?status=PROCESSED").json()["total"] == 1


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


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://localhost:5174"])
def test_json_preflight_allows_configured_frontend_origins(client, origin):
    response = client.options(
        "/api/v1/triajes",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"]


def test_json_preflight_does_not_authorize_unconfigured_origin(client):
    response = client.options(
        "/api/v1/triajes",
        headers={
            "Origin": "http://localhost:5175",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert "access-control-allow-origin" not in response.headers


def test_cors_allowed_origins_can_be_overridden_with_json_environment_value(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", '["https://frontend.example"]')

    settings = Settings(_env_file=None)

    assert settings.cors_allowed_origins == ["https://frontend.example"]


@pytest.mark.parametrize("origins", [["*"], ["not-an-origin"], ["https://example.com/path"]])
def test_cors_allowed_origins_reject_wildcard_and_malformed_values(origins):
    with pytest.raises(ValueError, match="CORS_ALLOWED_ORIGINS"):
        Settings(_env_file=None, cors_allowed_origins=origins)


def test_new_application_has_empty_history(tmp_path):
    settings = Settings(_env_file=None, storage_dir=tmp_path)
    with TestClient(create_app(settings)) as first:
        first.post("/api/v1/triajes", json=payload())
    with TestClient(create_app(settings)) as second:
        assert second.get("/api/v1/triajes").json()["total"] == 0


@pytest.mark.parametrize(
    "name,status,destination,urgent_alert",
    [
        ("rutina", "PROCESSED", "HISTORIA_CLINICA", False),
        ("urgencia", "NEEDS_AUDIT", "REVISION_HUMANA", True),
        ("ambiguo", "NEEDS_AUDIT", "REVISION_HUMANA", False),
    ],
)
def test_documented_json_fixtures(client, name, status, destination, urgent_alert):
    path = Path(__file__).resolve().parents[2] / "data" / "functional" / f"{name}.json"
    response = client.post("/api/v1/triajes/process-text", json=json.loads(path.read_text()))
    assert response.status_code == 201
    result = response.json()
    assert result["status"] == status
    assert result["decision_enrutamiento"]["destino_principal"] == destination
    assert result["decision_enrutamiento"]["alerta_urgente"] is urgent_alert


def test_storage_failure_does_not_register_document(client, monkeypatch):
    def fail(*args):
        raise OSError("Storage unavailable")

    monkeypatch.setattr(client.app.state.storage, "save", fail)
    with pytest.raises(OSError):
        client.post("/api/v1/triajes", json=payload())
    assert client.get("/api/v1/triajes").json()["total"] == 0


@pytest.mark.parametrize("provider,bucket", [("neon", "synthetic"), ("oci", "synthetic")])
def test_original_document_reads_only_matching_storage(client, monkeypatch, provider, bucket):
    assert client.post("/api/v1/triajes", json=payload()).status_code == 201
    triage = replace(
        client.app.state.repository.get("DOC-1"),
        storage_provider=provider,
        storage_bucket=bucket,
    )
    storage = Mock(spec=["provider", "bucket", "read"])
    storage.provider, storage.bucket = provider, bucket
    storage.read.return_value = ROUTINE.encode()
    client.app.state.storage = storage
    monkeypatch.setattr(client.app.state.repository, "get", lambda _: triage)

    response = client.get("/api/v1/triajes/DOC-1/documento")

    assert response.status_code == 200
    assert response.content == ROUTINE.encode()
    assert response.headers["x-content-type-options"] == "nosniff"
    storage.read.assert_called_once_with(triage.object_key)


@pytest.mark.parametrize(
    "record_provider,record_bucket,adapter_provider,adapter_bucket",
    [
        ("oci", "synthetic", "neon", "synthetic"),
        ("neon", "synthetic", "oci", "synthetic"),
        ("oci", "old-bucket", "oci", "new-bucket"),
        ("neon", "old-bucket", "neon", "new-bucket"),
        ("oci", None, "oci", "synthetic"),
        ("local", None, "oci", "synthetic"),
        ("oci", "synthetic", "local", None),
    ],
)
def test_original_document_rejects_storage_mismatch_before_read(
    client, monkeypatch, record_provider, record_bucket, adapter_provider, adapter_bucket
):
    assert client.post("/api/v1/triajes", json=payload()).status_code == 201
    triage = replace(
        client.app.state.repository.get("DOC-1"),
        storage_provider=record_provider,
        storage_bucket=record_bucket,
    )
    storage = Mock(spec=["provider", "bucket", "read"])
    storage.provider, storage.bucket = adapter_provider, adapter_bucket
    storage.read.return_value = ROUTINE.encode()
    client.app.state.storage = storage
    monkeypatch.setattr(client.app.state.repository, "get", lambda _: triage)

    response = client.get("/api/v1/triajes/DOC-1/documento")

    assert response.status_code == 503
    assert response.json() == {"detail": "El proveedor o bucket del original no esta disponible"}
    storage.read.assert_not_called()


def test_original_document_rejects_adapter_without_identity(client):
    assert client.post("/api/v1/triajes", json=payload()).status_code == 201
    storage = Mock(spec=["read"])
    storage.read.return_value = ROUTINE.encode()
    client.app.state.storage = storage

    assert client.get("/api/v1/triajes/DOC-1/documento").status_code == 503
    storage.read.assert_not_called()


@pytest.mark.parametrize("provider,bucket", [("oci", "synthetic"), ("local", "unexpected")])
def test_original_document_does_not_fallback_to_local(client, monkeypatch, provider, bucket):
    assert client.post("/api/v1/triajes", json=payload()).status_code == 201
    triage = replace(
        client.app.state.repository.get("DOC-1"),
        storage_provider=provider,
        storage_bucket=bucket,
    )
    read = Mock(return_value=ROUTINE.encode())
    monkeypatch.setattr(client.app.state.storage, "read", read)
    monkeypatch.setattr(client.app.state.repository, "get", lambda _: triage)

    assert client.get("/api/v1/triajes/DOC-1/documento").status_code == 503
    read.assert_not_called()
