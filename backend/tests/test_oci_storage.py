from io import BytesIO
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError
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


def test_oci_client_uses_explicit_credentials_and_bounded_s3_configuration(monkeypatch):
    factory = Mock()
    monkeypatch.setattr("boto3.client", factory)
    storage = OciDocumentStorage("synthetic", "sa-santiago-1", "bucket", "id", "secret")

    assert storage.client is factory.return_value
    args = factory.call_args.kwargs
    assert factory.call_args.args == ("s3",)
    assert args["endpoint_url"] == oci_endpoint("synthetic", "sa-santiago-1")
    assert args["region_name"] == "sa-santiago-1"
    assert args["aws_access_key_id"] == "id"
    assert args["aws_secret_access_key"] == "secret"
    config = args["config"]
    assert config.signature_version == "s3v4"
    assert config.s3 == {"addressing_style": "path"}
    assert (config.connect_timeout, config.read_timeout) == (5, 20)
    assert config.retries == {"max_attempts": 2, "mode": "standard"}


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


@pytest.mark.parametrize(
    "error",
    [
        ClientError({"Error": {"Code": "AccessDenied", "Message": "SECRET"}}, "GetObject"),
        EndpointConnectionError(endpoint_url="https://SECRET.invalid"),
    ],
)
def test_oci_read_errors_are_sanitized(error):
    client = Mock()
    client.get_object.side_effect = error
    storage = OciDocumentStorage("ns", "sa-santiago-1", "bucket", "id", "secret", client)
    with pytest.raises(StorageUnavailable, match="Documento temporalmente no disponible") as caught:
        storage.read("recibidos/synthetic")
    assert "SECRET" not in str(caught.value)


def test_oci_mode_works_with_memory_repository():
    settings = oci_settings()
    assert settings.storage_mode == "oci"
    assert settings.repository_mode == "memory"


@pytest.mark.parametrize("missing", list(OCI))
@pytest.mark.parametrize("value", [None, "", "   "])
def test_oci_mode_requires_every_variable_without_echoing_secrets(missing, value):
    with pytest.raises(ValidationError) as caught:
        oci_settings(**{missing: value})
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
def oci_app(monkeypatch):
    s3 = Mock()
    monkeypatch.setattr("boto3.client", Mock(return_value=s3))
    app = create_app(oci_settings())
    with TestClient(app) as client:
        yield client, s3


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

    stored = client.app.state.repository.get("DOC-OCI-1")
    assert (stored.storage_provider, stored.storage_bucket) == ("oci", "bucket-de-prueba")
    body_stream = BytesIO(ROUTINE.encode())
    s3.get_object.return_value = {"Body": body_stream}
    original = client.get("/api/v1/triajes/DOC-OCI-1/documento")
    assert original.status_code == 200
    assert original.content == ROUTINE.encode()
    assert body_stream.closed
    s3.get_object.assert_called_once_with(Bucket="bucket-de-prueba", Key=stored.object_key)


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


def test_api_oci_original_rejects_failed_integrity(oci_app):
    client, s3 = oci_app
    assert (
        client.post(
            "/api/v1/triajes",
            json={"documento_id": "OCI-HASH", "canal_origen": "test", "documento_texto": ROUTINE},
        ).status_code
        == 201
    )
    s3.get_object.return_value = {"Body": BytesIO(b"different synthetic bytes")}

    response = client.get("/api/v1/triajes/OCI-HASH/documento")

    assert response.status_code == 503
    assert response.json() == {"detail": "El original no supera la verificacion de integridad"}


def test_api_oci_read_failure_is_sanitized(oci_app):
    client, s3 = oci_app
    assert (
        client.post(
            "/api/v1/triajes",
            json={"documento_id": "OCI-READ", "canal_origen": "test", "documento_texto": ROUTINE},
        ).status_code
        == 201
    )
    s3.get_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "SECRET"}}, "GetObject"
    )

    response = client.get("/api/v1/triajes/OCI-READ/documento")

    assert response.status_code == 503
    assert response.json() == {"detail": "Documento temporalmente no disponible"}
    assert "SECRET" not in response.text
