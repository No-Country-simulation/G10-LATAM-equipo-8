from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.adapters.inbound.http.routes import router
from app.adapters.outbound.local_storage import LocalDocumentStorage
from app.adapters.outbound.memory import MemoryTriageRepository
from app.adapters.outbound.simulated_ai import SimulatedExtractor
from app.application.process_document import ProcessDocument
from app.domain.triaje import DocumentNotFound, DuplicateDocument
from app.infrastructure.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else Settings()
    app = FastAPI(
        title="MediFlow API",
        version="0.1.0",
        description="Pruebas funcionales: IA simulada, documentos locales, historial en memoria.",
    )
    app.state.settings = settings
    app.state.repository = MemoryTriageRepository()
    app.state.storage = LocalDocumentStorage(settings.storage_dir)
    app.state.processor = ProcessDocument(
        SimulatedExtractor(),
        app.state.repository,
        app.state.storage,
    )
    app.include_router(router)

    @app.exception_handler(DuplicateDocument)
    async def duplicate_handler(request: Request, error: DuplicateDocument):
        return JSONResponse(status_code=409, content={"detail": "Documento ya registrado"})

    @app.exception_handler(DocumentNotFound)
    async def not_found_handler(request: Request, error: DocumentNotFound):
        return JSONResponse(status_code=404, content={"detail": "Documento no encontrado"})

    @app.get("/health", tags=["health"])
    def health():
        return {
            "status": "ok",
            "entorno": settings.entorno,
            "ia": "simulada",
            "repositorio": "memoria",
            "almacenamiento": "local",
        }

    return app
