from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    entorno: str = "dev"
    ai_mode: Literal["simulated"] = "simulated"
    storage_dir: Path = Path("storage")
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
