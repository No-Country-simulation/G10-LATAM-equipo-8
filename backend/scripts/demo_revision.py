"""HTTP demo using synthetic fixtures. Start the API before running this script."""

import argparse
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4


def request(base_url, method, path, payload=None, expected=200):
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(
        base_url.rstrip("/") + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(req, timeout=10) as response:
            code, body = response.status, response.read()
    except HTTPError as error:
        code, body = error.code, error.read()
    if code != expected:
        raise RuntimeError(f"{method} {path}: esperaba {expected}, obtuvo {code}: {body.decode()}")
    return json.loads(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    base = parser.parse_args().base_url
    fixtures = Path(__file__).resolve().parents[2] / "data" / "functional"
    suffix = uuid4().hex[:8]
    cases = [
        (
            "APROBAR",
            "baja_confianza",
            {
                "accion": "aprobar",
                "destino": "HISTORIA_CLINICA",
            },
            "APPROVED",
        ),
        (
            "CORREGIR",
            "ambiguo",
            {
                "accion": "corregir_aprobar",
                "destino": "FARMACIA",
                "correcciones": {"nombre_paciente": "Ana Demo", "edad_paciente": 30},
            },
            "APPROVED",
        ),
        ("RECHAZAR", "ambiguo", {"accion": "rechazar"}, "REJECTED"),
    ]
    for label, fixture, action, expected_status in cases:
        payload = json.loads((fixtures / f"{fixture}.json").read_text(encoding="utf-8"))
        document_id = f"DEMO-{label}-{suffix}"
        payload["documento_id"] = document_id
        path = f"/api/v1/triajes/{document_id}"
        original = request(base, "POST", "/api/v1/triajes", payload, 201)
        assert original["status"] == "NEEDS_AUDIT"
        review = action | {
            "revisor": "auditor-demo",
            "comentario": "Revision manual de fixture sintetica",
        }
        result = request(base, "POST", path + "/revision", review)
        assert result["status"] == expected_status
        assert result["clasificacion"]["score_confianza_clasificacion"] == 0.2
        events = request(base, "GET", path + "/revisiones")
        assert len(events) == 1
        request(base, "POST", path + "/revision", review, 409)
        print(
            f"{document_id}: NEEDS_AUDIT -> {expected_status}; auditoria registrada; repeticion 409"
        )
    print("Demo HTTP completada: IA simulada, auditoria en memoria, sin despacho real.")


if __name__ == "__main__":
    main()
