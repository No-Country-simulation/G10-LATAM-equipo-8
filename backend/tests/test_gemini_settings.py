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
