"""Endpoints de triaje de documentos clínicos."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/triajes", tags=["triajes"])


class TriajeRequest(BaseModel):
    """Lo que tiene que llegar en el body de POST /triajes."""

    texto: str


class TriajeResponse(BaseModel):
    """Por ahora, un eco de lo recibido: confirma que Pydantic validó bien la entrada."""

    texto: str


@router.post("", response_model=TriajeResponse)
def crear_triaje(payload: TriajeRequest) -> TriajeResponse:
    return TriajeResponse(texto=payload.texto)
