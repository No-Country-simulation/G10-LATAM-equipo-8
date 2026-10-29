from fastapi import APIRouter, Request

from app.adapters.inbound.http.review_schemas import ReviewEventResponse, ReviewRequest
from app.adapters.inbound.http.schemas import DocumentId, TriageResponse

router = APIRouter(prefix="/api/v1/triajes", tags=["revision humana"])


@router.post("/{documento_id}/revision", response_model=TriageResponse)
def review_document(documento_id: DocumentId, payload: ReviewRequest, request: Request):
    changes = payload.correcciones.domain_changes() if payload.correcciones else {}
    triage = request.app.state.reviewer.execute(
        documento_id,
        payload.accion,
        payload.revisor,
        payload.comentario,
        payload.destino,
        changes,
    )
    return TriageResponse.from_domain(triage)


@router.get("/{documento_id}/revisiones", response_model=list[ReviewEventResponse])
def list_reviews(documento_id: DocumentId, request: Request):
    return [
        ReviewEventResponse.from_domain(event)
        for event in request.app.state.get_reviews.execute(documento_id)
    ]
