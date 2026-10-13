from io import BytesIO
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError

from app.adapters.outbound.neon_storage import StorageUnavailable
from app.adapters.outbound.oci_storage import OciDocumentStorage, oci_client_config, oci_endpoint
from app.adapters.outbound.simulated_ai import ROUTINE
from app.infrastructure.bootstrap import create_app
from app.infrastructure.settings import Settings

OCI = {
    "oci_namespace": "testnamespace",
    "oci_region": "sa-santiago-1",
    "oci_bucket": "bucket-de-prueba",
    "oci_access_key_id": SecretStr("synthetic-access"),
    "oci_secret_access_key": SecretStr("synthetic-secret"),
}


def oci_settings(**overrides):
    return Settings(_env_file=None, storage_mode="oci", **{**OCI, **overrides})


def test_endpoint_uses_namespace_and_region():
    assert (
        oci_endpoint("testnamespace", "sa-santiago-1")
        == "https://testnamespace.compat.objectstorage.sa-santiago-1.oraclecloud.com"
    )


def test_client_config_disables_aws_chunked_checksums():
    config = oci_client_config()
    assert config.request_checksum_calculation == "when_required"
    assert config.response_checksum_validation == "when_required"


def test_oci_storage_roundtrip_with_provider_and_bucket():
    client = Mock()
    client.get_object.return_value = {"Body": BytesIO(b"synthetic")}
    storage = OciDocumentStorage("ns", "sa-santiago-1", "bucket", "id", "secret", client)
    storage.save("recibidos/abc", b"synthetic")
    assert storage.read("recibidos/abc") == b"synthetic"
    assert storage.provider == "oci"
    assert storage.bucket == "bucket"
    assert client.put_object.call_args.kwargs["Bucket"] == "bucket"
    assert "ACL" not in client.put_object.call_args.kwargs


def test_oci_errors_do_not_expose_upstream_secrets():
    client = Mock()
    client.put_object.side_effect = ClientError(
        {"Error": {"Code": "SignatureDoesNotMatch", "Message": "SECRET"}}, "PutObject"
    )
    storage = OciDocumentStorage("ns", "sa-santiago-1", "bucket", "id", "secret", client)
    with pytest.raises(StorageUnavailable) as caught:
        storage.save("recibidos/abc", b"synthetic")
    assert "SECRET" not in str(caught.value)


def test_oci_mode_works_with_memory_repository():
    settings = oci_settings()
    assert settings.storage_mode == "oci"
    assert settings.repository_mode == "memory"


@pytest.mark.parametrize("missing", ["oci_namespace", "oci_bucket", "oci_secret_access_key"])
def test_oci_mode_requires_every_variable_without_echoing_secrets(missing):
    with pytest.raises(ValidationError) as caught:
        oci_settings(**{missing: None})
    assert missing.upper() in str(caught.value)
    assert "synthetic-secret" not in str(caught.value)


@pytest.mark.parametrize(
    "field,value",
    [("oci_namespace", "evil.example.com/x"), ("oci_region", "Chile Central")],
)
def test_oci_rejects_values_that_would_change_the_endpoint_host(field, value):
    with pytest.raises(ValidationError):
        oci_settings(**{field: value})


@pytest.fixture
def oci_app():
    app = create_app(oci_settings())
    app.state.storage.client = Mock()
    with TestClient(app) as client:
        yield client, app.state.storage.client


def test_api_saves_original_in_oci_without_changing_the_contract(oci_app):
    client, s3 = oci_app
    response = client.post(
        "/api/v1/triajes",
        json={
            "documento_id": "DOC-OCI-1",
            "canal_origen": "pruebas",
            "documento_texto": ROUTINE,
            "tipo_archivo": "TEXTO",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["almacenamiento"]["proveedor"] == "oci"
    assert body["almacenamiento_oci"] is None
    assert s3.put_object.call_args.kwargs["Bucket"] == "bucket-de-prueba"
    assert s3.put_object.call_args.kwargs["Key"] == body["almacenamiento"]["ruta_objeto"]
    assert client.get("/health").json()["almacenamiento"] == "oci"


def test_api_returns_503_and_keeps_nothing_when_oci_fails(oci_app):
    client, s3 = oci_app
    s3.put_object.side_effect = ClientError(
        {"Error": {"Code": "ServiceUnavailable", "Message": "SECRET"}}, "PutObject"
    )
    response = client.post(
        "/api/v1/triajes",
        json={
            "documento_id": "DOC-OCI-2",
            "canal_origen": "pruebas",
            "documento_texto": ROUTINE,
            "tipo_archivo": "TEXTO",
        },
    )
    assert response.status_code == 503
    assert "SECRET" not in response.text
    assert client.get("/api/v1/triajes/DOC-OCI-2").status_code == 404
