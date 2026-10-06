import json
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from dotenv import dotenv_values
from pydantic import AliasChoices, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def postgres_url(value: str) -> str:
    return value.replace("postgresql://", "postgresql+psycopg://", 1).replace(
        "postgres://", "postgresql+psycopg://", 1
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env.local", ".env"), extra="ignore", hide_input_in_errors=True
    )
    entorno: str = "dev"
    ai_mode: Literal["simulated", "gemini"] = "simulated"
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    gemini_timeout_seconds: float = Field(default=30, ge=1, le=60)
    gemini_max_retries: int = Field(default=1, ge=0, le=2)
    storage_dir: Path = Path("storage")
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
    repository_mode: Literal["memory", "postgres"] = "memory"
    storage_mode: Literal["local", "neon"] = "local"
    database_url: SecretStr | None = None
    database_url_direct: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DATABASE_URL_DIRECT", "DATABASE_URL_UNPOOLED", "database_url_direct"
        ),
    )
    neon_branch: Literal["development"] = "development"
    storage_bucket: str = "mediflow-pruebas"
    aws_endpoint_url_s3: str | None = None
    aws_region: str = "us-east-2"
    aws_access_key_id: SecretStr | None = None
    aws_secret_access_key: SecretStr | None = None

    @model_validator(mode="after")
    def validate_adapters(self):
        if self.ai_mode == "gemini":
            if not self.gemini_api_key or not self.gemini_api_key.get_secret_value().strip():
                raise ValueError("GEMINI_API_KEY requerido en modo gemini")
            if not self.gemini_model or not self.gemini_model.strip():
                raise ValueError("GEMINI_MODEL explicito requerido en modo gemini")
        if self.repository_mode == "postgres" and not self.database_url:
            raise ValueError("DATABASE_URL es obligatorio para PostgreSQL")
        if self.storage_mode == "neon":
            if self.repository_mode != "postgres":
                raise ValueError("Neon storage requiere PostgreSQL para reservas recuperables")
            if not all(
                (self.aws_endpoint_url_s3, self.aws_access_key_id, self.aws_secret_access_key)
            ):
                raise ValueError("Faltan credenciales explicitas del bucket Neon")
        if self.repository_mode == "postgres":
            root = Path(__file__).resolve().parents[3]
            link_path, env_path = root / ".neon", root / ".env.local"
            if not link_path.is_file() or not env_path.is_file():
                raise ValueError(
                    "Vincular Neon development y obtener .env.local antes de activar PostgreSQL"
                )
            link = json.loads(link_path.read_text())
            expected = dotenv_values(env_path)
            if link.get("branch") != "development" or expected.get("NEON_BRANCH") != "development":
                raise ValueError("Solo se autoriza Neon development en esta etapa")
            pairs = [(self.database_url, expected.get("DATABASE_URL"))]
            if self.database_url_direct:
                pairs.append(
                    (
                        self.database_url_direct,
                        expected.get("DATABASE_URL_UNPOOLED")
                        or expected.get("DATABASE_URL_DIRECT"),
                    )
                )
            if any(
                not target
                or urlsplit(secret.get_secret_value()).hostname != urlsplit(target).hostname
                for secret, target in pairs
            ):
                raise ValueError(
                    "La conexion no corresponde a las credenciales development vinculadas"
                )
            if self.storage_mode == "neon" and self.aws_endpoint_url_s3 != expected.get(
                "AWS_ENDPOINT_URL_S3"
            ):
                raise ValueError("El bucket no corresponde al endpoint development vinculado")
        return self
