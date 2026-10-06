from hashlib import sha256
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from app.adapters.inbound.http.schemas import (
    Channel,
    DocumentId,
    HistoryResponse,
    TextRequest,
    TriageResponse,
)
from app.adapters.outbound.neon_storage import StorageUnavailable
from app.domain.triaje import Destination, Status

router = APIRouter(prefix="/api/v1", tags=["triajes"])


@router.post("/triajes", response_model=TriageResponse, status_code=201)
@router.post("/triajes/process-text", response_model=TriageResponse, status_code=201)
def process_text(payload: TextRequest, request: Request):
    triage = request.app.state.processor.execute(
        payload.documento_id,
        payload.canal_origen,
        payload.documento_texto.encode("utf-8"),
        "text/plain",
    )
    return TriageResponse.from_domain(triage)


@router.post("/triajes/archivo", response_model=TriageResponse, status_code=201)
@router.post("/triajes/process-file", response_model=TriageResponse, status_code=201)
async def process_file(
    request: Request,
    documento_id: Annotated[DocumentId, Form()],
    canal_origen: Annotated[Channel, Form()],
    archivo: Annotated[UploadFile, File()],
):
    signatures = {
        "application/pdf": b"%PDF-",
        "image/png": b"\x89PNG\r\n\x1a\n",
        "image/jpeg": b"\xff\xd8\xff",
    }
    try:
        if archivo.content_type not in signatures:
            raise HTTPException(415, "Solo se aceptan PDF, PNG y JPEG")
        content = await archivo.read(request.app.state.settings.max_upload_bytes + 1)
        if len(content) > request.app.state.settings.max_upload_bytes:
            raise HTTPException(413, "Archivo demasiado grande")
        if not content.startswith(signatures[archivo.content_type]):
            raise HTTPException(415, "La firma del archivo no coincide con su tipo MIME")
        triage = await run_in_threadpool(
            request.app.state.processor.execute,
            documento_id,
            canal_origen,
            content,
            archivo.content_type,
            archivo.filename,
        )
        return TriageResponse.from_domain(triage)
    finally:
        await archivo.close()


def history(request: Request, status, destination, offset, limit) -> HistoryResponse:
    records = request.app.state.repository.list()
    if status is not None:
        records = [item for item in records if item.decision.status == status]
    if destination is not None:
        records = [item for item in records if item.decision.destination == destination]
    return HistoryResponse(
        items=[TriageResponse.from_domain(item) for item in records[offset : offset + limit]],
        total=len(records),
        offset=offset,
        limit=limit,
    )


@router.get("/triajes", response_model=HistoryResponse)
def list_triages(
    request: Request,
    status: Status | None = None,
    destino: Destination | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return history(request, status, destino, offset, limit)


@router.get("/audit/queue", response_model=HistoryResponse)
def audit_queue(
    request: Request,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return history(request, Status.NEEDS_AUDIT, None, offset, limit)


@router.get("/triajes/{documento_id}", response_model=TriageResponse)
def detail(documento_id: DocumentId, request: Request):
    return TriageResponse.from_domain(request.app.state.repository.get(documento_id))


@router.get("/triajes/{documento_id}/documento")
def original_document(documento_id: DocumentId, request: Request):
    triage = request.app.state.repository.get(documento_id)
    content = request.app.state.storage.read(triage.object_key)
    if triage.sha256 and sha256(content).hexdigest() != triage.sha256:
        raise StorageUnavailable("El original no supera la verificacion de integridad")
    return Response(
        content,
        media_type=triage.media_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )
