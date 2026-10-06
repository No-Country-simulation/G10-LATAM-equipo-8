from datetime import UTC, datetime
from hashlib import sha256
from uuid import uuid4

from app.application.ports import DocumentStorage, Extractor, TriageRepository
from app.domain.extraction import ExtractionProvenance, ProcessingStatus
from app.domain.triaje import Extraction, Triage, decide


class ProcessDocument:
    def __init__(
        self,
        extractor: Extractor,
        repository: TriageRepository,
        storage: DocumentStorage,
        provenance: ExtractionProvenance | None = None,
    ):
        self.extractor = extractor
        self.repository = repository
        self.storage = storage
        self.provenance = provenance or ExtractionProvenance()

    def execute(
        self,
        document_id: str,
        channel: str,
        content: bytes,
        media_type: str,
        original_filename: str | None = None,
    ) -> Triage:
        extraction = Extraction(None, None, None, audit_reasons=("PROCESSING_PENDING",))
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
            processing_status=ProcessingStatus.PENDING,
            provenance=self.provenance,
        )
        self.repository.create(triage, lambda: self.storage.save(triage.object_key, content))
        token = self.repository.begin_processing(document_id)
        try:
            extraction = self.extractor.extract(content, media_type)
            if not isinstance(extraction, Extraction):
                raise TypeError("Extractor must return the validated extraction contract")
        except Exception:  # noqa: BLE001 -- isolate this adapter boundary; never persist raw errors
            # Never persist upstream error text, credentials or invented confidence.
            failed = Extraction(None, None, None, audit_reasons=("EXTRACTION_FAILED",))
            return self.repository.finish_processing(
                document_id, token, failed, "EXTRACTION_FAILED"
            )
        return self.repository.finish_processing(document_id, token, extraction)
