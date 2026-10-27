"""Opt-in real development persistence acceptance. Adds synthetic rows; never deletes."""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from alembic import command
from alembic.config import Config
from create_synthetic_documents import pdf_bytes
from fastapi.testclient import TestClient

from app.adapters.outbound.simulated_ai import LOW_CONFIDENCE
from app.infrastructure.bootstrap import create_app
from app.infrastructure.settings import Settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate", action="store_true")
    parser.add_argument("--confirm-development", action="store_true", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    link = json.loads((root / ".neon").read_text())
    if link.get("branch") != "development" or link.get("projectId") != "wandering-voice-40276879":
        raise RuntimeError("Expected authorized development project link")
    settings = Settings(
        _env_file=(root / ".env.local", Path(".env")),
        repository_mode="postgres",
        storage_mode="neon",
    )
    if args.migrate:
        command.upgrade(Config("alembic.ini"), "head")
    document_id = f"NEON-DEMO-{uuid4().hex[:12]}"
    first_app = create_app(settings)
    with TestClient(first_app) as client:
        payload = {
            "documento_id": document_id,
            "canal_origen": "web",
            "documento_texto": LOW_CONFIDENCE,
        }
        response = client.post("/api/v1/triajes", json=payload)
        assert response.status_code == 201, f"Ingest: {response.status_code}"
        assert response.json()["almacenamiento"]["proveedor"] == "neon"
        assert client.post("/api/v1/triajes", json=payload).status_code == 409
        raw = client.get(f"/api/v1/triajes/{document_id}/documento")
        assert sha256(raw.content).hexdigest() == sha256(LOW_CONFIDENCE.encode()).hexdigest()
        pdf_id = document_id + "-PDF"
        pdf = pdf_bytes()
        result = client.post(
            "/api/v1/triajes/archivo",
            data={"documento_id": pdf_id, "canal_origen": "web"},
            files={"archivo": ("demo-synthetic.pdf", pdf, "application/pdf")},
        )
        assert result.status_code == 201
        assert result.json()["status"] == "NEEDS_AUDIT"
        assert client.get(f"/api/v1/triajes/{pdf_id}/documento").content == pdf
    first_app.state.repository.engine.dispose()
    second_app = create_app(settings)
    with TestClient(second_app) as client:
        assert client.get(f"/api/v1/triajes/{document_id}").status_code == 200
        review = {
            "accion": "aprobar",
            "revisor": "synthetic-demo",
            "comentario": "Synthetic acceptance only",
            "destino": "HISTORIA_CLINICA",
        }
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(
                pool.map(
                    lambda _: (
                        client.post(
                            f"/api/v1/triajes/{document_id}/revision", json=review
                        ).status_code
                    ),
                    range(2),
                )
            )
        assert sorted(results) == [200, 409], results
        events = client.get(f"/api/v1/triajes/{document_id}/revisiones").json()
        assert len(events) == 1
        assert (
            client.get(f"/api/v1/triajes/{document_id}").json()["clasificacion"][
                "score_confianza_clasificacion"
            ]
            == 0.2
        )
    second_app.state.repository.engine.dispose()
    print(
        f"PASS development synthetic persistence, PDF/hash, restart, review/concurrency. IDs: {document_id}, {pdf_id}"
    )


if __name__ == "__main__":
    main()
