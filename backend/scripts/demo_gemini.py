"""Explicit opt-in HTTP demo; the running server owns provider credentials."""

import argparse
from uuid import uuid4

import httpx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8002")
    parser.add_argument("--confirm-provider-call", action="store_true", required=True)
    args = parser.parse_args()
    # One request with synthetic data; never silently activate an external provider.
    with httpx.Client(base_url=args.base_url, timeout=190) as client:
        health = client.get("/health")
        health.raise_for_status()
        if health.json().get("ia") != "gemini":
            raise SystemExit("Activate AI_MODE=gemini explicitly before this demo")
        document_id = "GEMINI-DEMO-" + uuid4().hex[:10]
        content = (
            "SYNTHETIC ONLY. Paciente Demo, 30 anos. Informe de Laboratorio. Prioridad Rutina."
        )
        result = client.post(
            "/api/v1/triajes",
            json={"documento_id": document_id, "canal_origen": "web", "documento_texto": content},
        )
        result.raise_for_status()
        body = result.json()
        if body["status"] != "NEEDS_AUDIT":
            raise SystemExit("Unexpected routing: human review required")
        original = client.get(f"/api/v1/triajes/{document_id}/documento")
        original.raise_for_status()
        assert original.content == content.encode()
        print(
            f"ID={document_id} processing={body['processing_status']} error={body['processing_error']} review=NEEDS_AUDIT"
        )


if __name__ == "__main__":
    main()
