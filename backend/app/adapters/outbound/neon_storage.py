from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


class StorageUnavailable(Exception):
    """Safe public failure without credentials or upstream response content."""


class NeonDocumentStorage:
    provider = "neon"

    def __init__(
        self, bucket: str, endpoint: str, region: str, access_key: str, secret_key: str, client=None
    ):
        import boto3

        self.bucket = bucket
        self.client = (
            client
            if client is not None
            else boto3.client(
                "s3",
                endpoint_url=endpoint,
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(
                    signature_version="s3v4",
                    s3={"addressing_style": "path"},
                    connect_timeout=5,
                    read_timeout=20,
                    retries={"max_attempts": 2, "mode": "standard"},
                ),
            )
        )

    def save(self, object_key: str, content: bytes) -> None:
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_key,
                Body=content,
                ContentType="application/octet-stream",
            )
        except (BotoCoreError, ClientError):
            raise StorageUnavailable("Almacenamiento temporalmente no disponible") from None

    def read(self, object_key: str) -> bytes:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=object_key)
            body = response["Body"]
            try:
                return body.read()
            finally:
                body.close()
        except (BotoCoreError, ClientError):
            raise StorageUnavailable("Documento temporalmente no disponible") from None
