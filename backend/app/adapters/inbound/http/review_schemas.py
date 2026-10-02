from dataclasses import asdict
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.domain.review import ReviewAction, ReviewEvent
from app.domain.triaje import Destination, Priority, Status

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Comment = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
DocumentType = Literal[
    "Informe de Laboratorio",
    "Informe de Imagenes",
    "Receta Medica",
    "Orden de Procedimiento",
    "Epicrisis",
    "Certificado Medico",
]


class Corrections(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nombre_paciente: NonBlank | None = None
    edad_paciente: int | None = Field(default=None, ge=0, le=130, strict=True)
    tipo_documento: DocumentType | None = None
    nivel_prioridad: Priority | None = None

    @model_validator(mode="after")
    def valid_nulls(self):
        for field in self.model_fields_set - {"edad_paciente"}:
            if getattr(self, field) is None:
                raise ValueError("Solo edad_paciente permite una correccion a null")
        return self

    def domain_changes(self):
        mapping = {
            "nombre_paciente": "patient_name",
            "edad_paciente": "patient_age",
            "tipo_documento": "document_type",
            "nivel_prioridad": "priority",
        }
        return {mapping[key]: value for key, value in self.model_dump(exclude_unset=True).items()}


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accion: ReviewAction
    revisor: NonBlank
    comentario: Comment
    destino: Destination | None = None
    correcciones: Corrections | None = None


class ExtractionSnapshot(BaseModel):
    document_type: str
    priority: Priority
    confidence: float
    patient_name: str | None
    patient_age: int | None
    audit_reasons: list[str]


class FieldChange(BaseModel):
    field: str
    before: str | int | None
    after: str | int | None


class ReviewEventResponse(BaseModel):
    review_id: str
    document_id: str
    action: ReviewAction
    reviewer: str
    comment: str
    created_at: datetime
    previous_status: Status
    new_status: Status
    before: ExtractionSnapshot
    after: ExtractionSnapshot
    previous_destination: Destination
    new_destination: Destination
    corrections: list[FieldChange]

    @classmethod
    def from_domain(cls, event: ReviewEvent):
        return cls.model_validate(asdict(event))
