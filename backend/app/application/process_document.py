from datetime import UTC, datetime
from hashlib import sha256
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

    def execute(
        self,
        document_id: str,
        channel: str,
        content: bytes,
        media_type: str,
        original_filename: str | None = None,
    ) -> Triage:
        extraction = self.extractor.extract(content, media_type)
        triage = Triage(
            document_id=document_id,
            channel=channel,
            media_type=media_type,
            object_key=f"recibidos/{uuid4().hex}",
            created_at=datetime.now(UTC),
            extraction=extraction,
            decision=decide(extraction),
            storage_provider=getattr(self.storage, "provider", "local"),
            storage_bucket=getattr(self.storage, "bucket", None),
            size_bytes=len(content),
            sha256=sha256(content).hexdigest(),
            original_filename=original_filename,
        )
        self.repository.create(triage, lambda: self.storage.save(triage.object_key, content))
        return self.repository.get(document_id)
