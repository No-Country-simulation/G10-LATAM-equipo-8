"""Unit/API tests never opt in to cloud adapters through developer dotenv files."""

import pytest


@pytest.fixture(autouse=True)
def isolate_adapters(monkeypatch):
    monkeypatch.setenv("REPOSITORY_MODE", "memory")
    monkeypatch.setenv("STORAGE_MODE", "local")
