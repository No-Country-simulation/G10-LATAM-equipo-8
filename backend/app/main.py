"""Punto de entrada de la API. Acá se arma la app de FastAPI y se registran sus rutas."""

from fastapi import FastAPI

from app.api.triajes import router as triajes_router
from app.core.config import get_settings

app = FastAPI(title="MediFlow API")
app.include_router(triajes_router, prefix="/api/v1")


@app.get("/health")
def health() -> dict:
    """Endpoint de salud: le sirve a Docker/OCI para saber si el servicio está vivo."""
    settings = get_settings()
    return {"status": "ok", "entorno": settings.entorno}
