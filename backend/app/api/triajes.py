"""Endpoints de triaje de documentos clínicos."""

from fastapi import APIRouter

from app.schemas.triaje import AlmacenamientoOci, TriajeRequest, TriajeResponse
from app.services.grafo import ejecutar_grafo

router = APIRouter(prefix="/triajes", tags=["triajes"])


@router.post("", response_model=TriajeResponse)
def crear_triaje(payload: TriajeRequest) -> TriajeResponse:
    resultado = ejecutar_grafo(payload)
    return TriajeResponse(
        status="procesado",
        documento_id=payload.documento_id,
        clasificacion=resultado.clasificacion,
        datos_extraidos=resultado.datos_extraidos,
        decision_enrutamiento=resultado.decision_enrutamiento,
        almacenamiento_oci=AlmacenamientoOci(
            bucket="mediflow-documentos-clinicos",
            ruta_objeto=f"procesados/urgentes/{payload.documento_id}.json",
            status_backup="exito",
        ),
    )
