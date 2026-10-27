from pathlib import Path

import pytest
from pydantic import SecretStr, ValidationError

from app.infrastructure.settings import Settings


def test_simulated_does_not_require_key_or_model():
    assert Settings(_env_file=None).ai_mode == "simulated"


def test_gemini_missing_key_fails_fast_without_input_echo():
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, ai_mode="gemini", gemini_model="gemini-test")
    assert "GEMINI_API_KEY" in str(caught.value)


def test_model_must_be_explicit_and_secret_not_in_error():
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, ai_mode="gemini", gemini_api_key=SecretStr("synthetic-secret"))
    assert "synthetic-secret" not in str(caught.value)
    assert "GEMINI_MODEL" in str(caught.value)


def test_neon_validation_file_paths_are_configurable_without_changing_local_defaults(monkeypatch):
    local_settings = Settings(_env_file=None)
    assert local_settings.neon_link_path.name == ".neon"
    assert local_settings.neon_environment_path.name == ".env.local"

    monkeypatch.setenv("NEON_LINK_PATH", "/run/mediflow/neon/link.json")
    monkeypatch.setenv("NEON_ENVIRONMENT_PATH", "/run/mediflow/neon/environment")
    mounted_settings = Settings(_env_file=None)

    assert mounted_settings.neon_link_path == Path("/run/mediflow/neon/link.json")
    assert mounted_settings.neon_environment_path == Path("/run/mediflow/neon/environment")
