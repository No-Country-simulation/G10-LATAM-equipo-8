from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from threading import RLock
from uuid import uuid4

from app.domain.extraction import ProcessingStatus
from app.domain.review import ReviewConflict, ReviewEvent
from app.domain.triaje import DocumentNotFound, DuplicateDocument, Extraction, Triage, decide


class MemoryTriageRepository:
    """Single-process test adapter. Records disappear on restart."""

    def __init__(self):
        self._records: dict[str, Triage] = {}
        self._reviews: dict[str, tuple[ReviewEvent, ...]] = {}
        self._lock = RLock()
        self._processing: dict[str, tuple[str, datetime]] = {}

    def create(self, triage: Triage, save_document: Callable[[], None]) -> None:
        with self._lock:
            if triage.document_id in self._records:
                raise DuplicateDocument(triage.document_id)
            save_document()
            self._records[triage.document_id] = triage

    def get(self, document_id: str) -> Triage:
        with self._lock:
            try:
                return self._records[document_id]
            except KeyError:
                raise DocumentNotFound(document_id) from None

    def list(self) -> list[Triage]:
        with self._lock:
            return sorted(self._records.values(), key=lambda item: item.created_at, reverse=True)

    def review(
        self, document_id: str, transition: Callable[[Triage], tuple[Triage, ReviewEvent]]
    ) -> Triage:
        # Check, transition and event append share one lock; failures change nothing.
        with self._lock:
            current = self.get(document_id)
            if current.processing_status in {ProcessingStatus.PENDING, ProcessingStatus.PROCESSING}:
                raise ReviewConflict("Extraccion aun no finalizada")
            updated, event = transition(current)
            events = self._reviews.get(document_id, ()) + (event,)
            self._records[document_id] = updated
            self._reviews[document_id] = events
            return updated

    def reviews(self, document_id: str) -> tuple[ReviewEvent, ...]:
        with self._lock:
            self.get(document_id)
            return self._reviews.get(document_id, ())

    def begin_processing(self, document_id: str, previous_token: str | None = None) -> str:
        with self._lock:
            current = self.get(document_id)
            now = datetime.now(UTC)
            if current.processing_status == ProcessingStatus.PROCESSING:
                token, expiry = self._processing[document_id]
                if previous_token != token or now < expiry:
                    raise ReviewConflict("Procesamiento activo o token obsoleto")
            elif (
                current.processing_status != ProcessingStatus.PENDING or previous_token is not None
            ):
                raise ReviewConflict("Procesamiento ya finalizado")
            token = uuid4().hex
            self._processing[document_id] = (token, now + timedelta(minutes=5))
            self._records[document_id] = replace(
                current, processing_status=ProcessingStatus.PROCESSING
            )
            return token

    def finish_processing(
        self, document_id: str, token: str, extraction: Extraction, error_code: str | None = None
    ) -> Triage:
        with self._lock:
            current = self.get(document_id)
            if (
                current.processing_status != ProcessingStatus.PROCESSING
                or self._processing.get(document_id, (None,))[0] != token
            ):
                raise ReviewConflict("Token de procesamiento obsoleto")
            updated = replace(
                current,
                extraction=extraction,
                decision=decide(extraction),
                processing_status=ProcessingStatus.FAILED
                if error_code
                else ProcessingStatus.SUCCEEDED,
                processing_error=error_code,
            )
            self._records[document_id] = updated
            del self._processing[document_id]
            return updated
