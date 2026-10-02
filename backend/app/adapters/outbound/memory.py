from collections.abc import Callable
from threading import RLock

from app.domain.review import ReviewEvent
from app.domain.triaje import DocumentNotFound, DuplicateDocument, Triage


class MemoryTriageRepository:
    """Single-process test adapter. Records disappear on restart."""

    def __init__(self):
        self._records: dict[str, Triage] = {}
        self._reviews: dict[str, tuple[ReviewEvent, ...]] = {}
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

    def review(
        self, document_id: str, transition: Callable[[Triage], tuple[Triage, ReviewEvent]]
    ) -> Triage:
        # Check, transition and event append share one lock; failures change nothing.
        with self._lock:
            current = self.get(document_id)
            updated, event = transition(current)
            events = self._reviews.get(document_id, ()) + (event,)
            self._records[document_id] = updated
            self._reviews[document_id] = events
            return updated

    def reviews(self, document_id: str) -> tuple[ReviewEvent, ...]:
        with self._lock:
            self.get(document_id)
            return self._reviews.get(document_id, ())
