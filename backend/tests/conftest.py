"""Unit/API tests never opt in to cloud adapters through developer dotenv files."""

import pytest


@pytest.fixture(autouse=True)
def isolate_adapters(monkeypatch):
    monkeypatch.setenv("REPOSITORY_MODE", "memory")
    monkeypatch.setenv("STORAGE_MODE", "local")
    monkeypatch.setenv("AI_MODE", "simulated")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
