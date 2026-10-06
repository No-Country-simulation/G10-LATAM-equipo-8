from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from app.domain.extraction import ExtractionProvenance, ProcessingStatus, SourceReference


class Status(StrEnum):
    PROCESSED = "PROCESSED"
    NEEDS_AUDIT = "NEEDS_AUDIT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Priority(StrEnum):
    ROUTINE = "Rutina"
    URGENT = "Urgente"


class Destination(StrEnum):
    HISTORY = "HISTORIA_CLINICA"
    EMERGENCY = "EMERGENCIA_MEDICA"
    REVIEW = "REVISION_HUMANA"
    PHARMACY = "FARMACIA"
    AUTHORIZATIONS = "AUDITORIA_AUTORIZACIONES"


@dataclass(frozen=True)
class Extraction:
    document_type: str | None
    priority: Priority | None
    confidence: float | None
    patient_name: str | None = None
    patient_age: int | None = None
    audit_reasons: tuple[str, ...] = ()
    schema_version: int = 2
    professional_name: str | None = None
    professional_registration: str | None = None
    study: str | None = None
    indication: str | None = None
    diagnosis: str | None = None
    cie10_suggested: str | None = None
    evidence: tuple[SourceReference, ...] = ()

    def __post_init__(self):
        if self.schema_version not in (1, 2):
            raise ValueError("Unsupported extraction schema")
        if self.priority is not None and not isinstance(self.priority, Priority):
            raise ValueError("Invalid priority contract")
        if self.confidence is not None and (
            type(self.confidence) not in (int, float) or not 0 <= self.confidence <= 1
        ):
            raise ValueError("Invalid confidence contract")
        if any(not isinstance(item, SourceReference) for item in self.evidence):
            raise ValueError("Invalid evidence contract")


@dataclass(frozen=True)
class Decision:
    status: Status
    destination: Destination
    urgent_alert: bool


def decide(extraction: Extraction) -> Decision:
    urgent = extraction.priority == Priority.URGENT
    # Alerting is independent of authorization to route the document.
    if extraction.audit_reasons or any(
        value is None
        for value in (extraction.document_type, extraction.priority, extraction.confidence)
    ):
        return Decision(Status.NEEDS_AUDIT, Destination.REVIEW, urgent)
    destination = Destination.EMERGENCY if urgent else Destination.HISTORY
    return Decision(Status.PROCESSED, destination, urgent)


@dataclass(frozen=True)
class Triage:
    document_id: str
    channel: str
    media_type: str
    object_key: str
    created_at: datetime
    extraction: Extraction
    decision: Decision
    storage_provider: str = "local"
    size_bytes: int = 0
    sha256: str = ""
    original_filename: str | None = None
    storage_bucket: str | None = None
    processing_status: ProcessingStatus = ProcessingStatus.SUCCEEDED
    processing_error: str | None = None
    provenance: ExtractionProvenance = field(default_factory=ExtractionProvenance)


class DuplicateDocument(Exception):
    pass


class DocumentNotFound(Exception):
    pass
