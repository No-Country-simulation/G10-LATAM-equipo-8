"""Strict provider response schema; no framework types leak into the domain."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.extraction import SourceReference
from app.domain.triaje import Extraction, Priority

DocumentType = Literal[
    "Informe de Laboratorio",
    "Informe de Imagenes",
    "Receta Medica",
    "Orden de Procedimiento",
    "Epicrisis",
    "Certificado Medico",
    "No determinado",
]


class EvidencePayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    field: str
    page: int | None = Field(ge=1)
    quote: str | None


class GeminiPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    document_type: DocumentType | None
    priority: Literal["Rutina", "Urgente"] | None
    confidence: float | None = Field(ge=0, le=1)
    patient_name: str | None
    patient_age: int | None = Field(ge=0, le=130)
    professional_name: str | None
    professional_registration: str | None
    study: str | None
    indication: str | None
    diagnosis: str | None
    cie10_suggested: str | None
    evidence: list[EvidencePayload] = Field(max_length=30)

    def to_domain(self, reasons: tuple[str, ...] = ()) -> Extraction:
        values = self.model_dump(exclude={"evidence", "priority"})
        return Extraction(
            **values,
            priority=Priority(self.priority) if self.priority else None,
            audit_reasons=reasons,
            evidence=tuple(SourceReference(**item.model_dump()) for item in self.evidence),
        )
