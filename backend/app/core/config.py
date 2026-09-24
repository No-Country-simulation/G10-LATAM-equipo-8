"""Configuración central del backend.

Todo parámetro ajustable vive acá y se lee del .env. Ningún otro módulo llama a
os.getenv() directamente: así hay un único lugar donde mirar qué se puede
configurar (mismo patrón que usamos en el challenge anterior).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings del backend, leídos de variables de entorno o del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    entorno: str = "dev"


@lru_cache
def get_settings() -> Settings:
    """Devuelve los settings (cacheados: el .env se lee una sola vez por proceso)."""
    return Settings()
