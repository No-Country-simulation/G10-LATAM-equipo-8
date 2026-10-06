from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.adapters.inbound.http.review_routes import router as review_router
from app.adapters.inbound.http.routes import router
from app.adapters.outbound.local_storage import LocalDocumentStorage
from app.adapters.outbound.memory import MemoryTriageRepository
from app.adapters.outbound.neon_storage import NeonDocumentStorage, StorageUnavailable
from app.adapters.outbound.simulated_ai import SimulatedExtractor
from app.application.process_document import ProcessDocument
from app.application.review_document import GetReviews, ReviewDocument
from app.application.triage_pipeline import TriagePipeline
from app.domain.extraction import ExtractionProvenance
from app.domain.review import InvalidReview, ReviewConflict
from app.domain.triaje import DocumentNotFound, DuplicateDocument
from app.infrastructure.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine = getattr(app.state.repository, "engine", None)
        if engine is not None:
            engine.dispose()
        close = getattr(app.state.processor.extractor, "close", None)
        if close:
            close()

    app = FastAPI(
        title="MediFlow API",
        version="0.1.0",
        description="Pruebas funcionales sintéticas; sin seguridad clínica acreditada.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.repository = MemoryTriageRepository()
    app.state.storage = LocalDocumentStorage(settings.storage_dir)
    if settings.repository_mode == "postgres":
        from sqlalchemy import create_engine

        from app.adapters.outbound.postgres import PostgresTriageRepository
        from app.infrastructure.settings import postgres_url

        engine = create_engine(
            postgres_url(settings.database_url.get_secret_value()),
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
        )
        app.state.repository = PostgresTriageRepository(engine)
    if settings.storage_mode == "neon":
        app.state.storage = NeonDocumentStorage(
            settings.storage_bucket,
            settings.aws_endpoint_url_s3,
            settings.aws_region,
            settings.aws_access_key_id.get_secret_value(),
            settings.aws_secret_access_key.get_secret_value(),
        )
    extractor = SimulatedExtractor()
    provenance = ExtractionProvenance(provider="simulated", model="fixtures-v1")
    if settings.ai_mode == "gemini":
        from app.adapters.outbound.gemini_ai import GeminiExtractor

        extractor = GeminiExtractor(
            settings.gemini_api_key.get_secret_value(),
            settings.gemini_model,
            timeout_seconds=settings.gemini_timeout_seconds,
            max_retries=settings.gemini_max_retries,
        )
        provenance = extractor.provenance
    app.state.processor = ProcessDocument(
        TriagePipeline(extractor),
        app.state.repository,
        app.state.storage,
        provenance=provenance,
    )
    app.include_router(router)
    app.state.reviewer = ReviewDocument(app.state.repository)
    app.state.get_reviews = GetReviews(app.state.repository)
    app.include_router(review_router)

    @app.exception_handler(StorageUnavailable)
    async def storage_handler(request: Request, error: StorageUnavailable):
        return JSONResponse(status_code=503, content={"detail": str(error)})

    @app.exception_handler(ReviewConflict)
    async def review_conflict_handler(request: Request, error: ReviewConflict):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    @app.exception_handler(InvalidReview)
    async def invalid_review_handler(request: Request, error: InvalidReview):
        return JSONResponse(status_code=422, content={"detail": str(error)})

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
            "ia": "simulada" if settings.ai_mode == "simulated" else "gemini",
            "repositorio": "memoria" if settings.repository_mode == "memory" else "postgres",
            "almacenamiento": settings.storage_mode,
        }

    return app
