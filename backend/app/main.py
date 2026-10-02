"""Composition root. Run from backend with uv run uvicorn app.main:app."""

from app.infrastructure.bootstrap import create_app

app = create_app()
