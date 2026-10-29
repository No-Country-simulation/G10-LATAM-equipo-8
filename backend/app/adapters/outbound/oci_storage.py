"""OCI Object Storage a través de su API compatible con S3.

Reutiliza save/read y el manejo de errores del adaptador S3 de Neon; solo cambia
el endpoint y la configuración del cliente.
"""

from botocore.config import Config

from app.adapters.outbound.neon_storage import NeonDocumentStorage


def oci_endpoint(namespace: str, region: str) -> str:
    return f"https://{namespace}.compat.objectstorage.{region}.oraclecloud.com"


def oci_client_config() -> Config:
    return Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        connect_timeout=5,
        read_timeout=20,
        retries={"max_attempts": 2, "mode": "standard"},
        # boto3 >= 1.36 firma con "aws-chunked" por defecto y OCI responde NotImplemented.
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )


class OciDocumentStorage(NeonDocumentStorage):
    provider = "oci"

    def __init__(
        self,
        namespace: str,
        region: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        client=None,
    ):
        endpoint = oci_endpoint(namespace, region)
        if client is None:
            import boto3

            client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=oci_client_config(),
            )
        super().__init__(bucket, endpoint, region, access_key, secret_key, client)
