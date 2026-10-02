from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class Status(StrEnum):
    PROCESSED = "PROCESSED"
    NEEDS_AUDIT = "NEEDS_AUDIT"


class Priority(StrEnum):
    ROUTINE = "Rutina"
    URGENT = "Urgente"


class Destination(StrEnum):
    HISTORY = "HISTORIA_CLINICA"
    EMERGENCY = "EMERGENCIA_MEDICA"
    REVIEW = "REVISION_HUMANA"


@dataclass(frozen=True)
class Extraction:
    document_type: str
    priority: Priority
    confidence: float
    patient_name: str | None = None
    patient_age: int | None = None
    audit_reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class Decision:
    status: Status
    destination: Destination
    urgent_alert: bool


def decide(extraction: Extraction) -> Decision:
    urgent = extraction.priority == Priority.URGENT
    # Alerting is independent of authorization to route the document.
    if extraction.audit_reasons:
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


class DuplicateDocument(Exception):
    pass


class DocumentNotFound(Exception):
    pass
