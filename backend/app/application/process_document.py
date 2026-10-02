from datetime import UTC, datetime
from uuid import uuid4

from app.application.ports import DocumentStorage, Extractor, TriageRepository
from app.domain.triaje import Triage, decide


class ProcessDocument:
    def __init__(
        self, extractor: Extractor, repository: TriageRepository, storage: DocumentStorage
    ):
        self.extractor = extractor
        self.repository = repository
        self.storage = storage

    def execute(self, document_id: str, channel: str, content: bytes, media_type: str) -> Triage:
        extraction = self.extractor.extract(content, media_type)
        triage = Triage(
            document_id=document_id,
            channel=channel,
            media_type=media_type,
            object_key=f"recibidos/{uuid4().hex}",
            created_at=datetime.now(UTC),
            extraction=extraction,
            decision=decide(extraction),
        )
        self.repository.create(triage, lambda: self.storage.save(triage.object_key, content))
        return triage
