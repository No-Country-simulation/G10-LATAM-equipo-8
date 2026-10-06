from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from math import isfinite

from app.domain.extraction import (
    ExtractionProvenance,
    ProcessingStatus,
    SourceReference,
    validate_optional_text,
)

DOCUMENT_TYPES = frozenset(
    {
        "Informe de Laboratorio",
        "Informe de Imagenes",
        "Receta Medica",
        "Orden de Procedimiento",
        "Epicrisis",
        "Certificado Medico",
    }
)


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
        if type(self.schema_version) is not int or self.schema_version not in (1, 2):
            raise ValueError("Unsupported extraction schema")
        if self.document_type is not None and (
            not isinstance(self.document_type, str)
            or self.document_type not in DOCUMENT_TYPES | {"No determinado"}
        ):
            raise ValueError("Invalid document type contract")
        for value in (
            self.patient_name,
            self.professional_name,
            self.professional_registration,
            self.study,
            self.indication,
            self.diagnosis,
            self.cie10_suggested,
        ):
            validate_optional_text(value)
        if self.patient_age is not None and (
            type(self.patient_age) is not int or not 0 <= self.patient_age <= 130
        ):
            raise ValueError("Invalid technical age contract")
        if self.priority is not None and not isinstance(self.priority, Priority):
            raise ValueError("Invalid priority contract")
        if self.confidence is not None and (
            type(self.confidence) not in (int, float)
            or not isfinite(self.confidence)
            or not 0 <= self.confidence <= 1
        ):
            raise ValueError("Invalid confidence contract")
        if not isinstance(self.audit_reasons, tuple) or any(
            not isinstance(item, str) for item in self.audit_reasons
        ):
            raise ValueError("Invalid audit reasons contract")
        if not isinstance(self.evidence, tuple) or any(
            not isinstance(item, SourceReference) for item in self.evidence
        ):
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
