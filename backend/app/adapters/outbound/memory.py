from collections.abc import Callable
from threading import RLock

from app.domain.triaje import DocumentNotFound, DuplicateDocument, Triage


class MemoryTriageRepository:
    """Single-process test adapter. Records disappear on restart."""

    def __init__(self):
        self._records: dict[str, Triage] = {}
        self._lock = RLock()

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
