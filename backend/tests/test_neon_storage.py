from io import BytesIO
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from app.adapters.outbound.neon_storage import NeonDocumentStorage, StorageUnavailable


def test_neon_storage_roundtrip_and_private_client():
    client = Mock()
    client.get_object.return_value = {"Body": BytesIO(b"synthetic")}
    storage = NeonDocumentStorage(
        "test", "https://example.invalid", "us-east-2", "id", "secret", client
    )
    storage.save("opaque-key", b"synthetic")
    assert storage.read("opaque-key") == b"synthetic"
    assert client.put_object.call_args.kwargs["Bucket"] == "test"
    assert "ACL" not in client.put_object.call_args.kwargs


def test_neon_errors_do_not_expose_upstream_secrets():
    client = Mock()
    client.put_object.side_effect = ClientError(
        {"Error": {"Code": "Denied", "Message": "SECRET"}}, "PutObject"
    )
    storage = NeonDocumentStorage(
        "test", "https://example.invalid", "us-east-2", "id", "secret", client
    )
    with pytest.raises(StorageUnavailable) as caught:
        storage.save("opaque-key", b"synthetic")
    assert "SECRET" not in str(caught.value)
