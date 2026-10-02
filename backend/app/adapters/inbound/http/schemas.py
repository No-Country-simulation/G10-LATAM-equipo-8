from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.domain.triaje import Destination, Priority, Status, Triage

DocumentId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,100}$")]
Channel = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class TextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    documento_id: DocumentId
    canal_origen: Channel
    documento_texto: str = Field(min_length=1, max_length=100_000, pattern=r"\S")
    # Compatibility metadata: this endpoint receives extracted text, not binary files.
    tipo_archivo: Literal["TEXTO", "JSON", "PDF", "IMAGEN"] = "TEXTO"


class Classification(BaseModel):
    tipo_documento: str
    especialidad: str | None = None
    nivel_prioridad: Priority
    score_confianza_clasificacion: float = Field(ge=0, le=1)


class Patient(BaseModel):
    nombre: str | None
    edad: int | None


class ExtractedData(BaseModel):
    paciente: Patient
    medico_solicitante: dict | None = None
    estudio_realizado: str | None = None
    diagnostico_principal: str | None = None
    cie10_sugerido: str | None = None


class Routing(BaseModel):
    destino_principal: Destination
    requiere_auditoria_humana: bool
    justificacion_enrutamiento: str
    alerta_urgente: bool
    notificacion_generada: None = None


class StorageInfo(BaseModel):
    proveedor: Literal["local"] = "local"
    ruta_objeto: str
    status_backup: Literal["exito"] = "exito"


class TriageResponse(BaseModel):
    documento_id: str
    status: Status
    canal_origen: str
    created_at: datetime
    clasificacion: Classification
    datos_extraidos: ExtractedData
    decision_enrutamiento: Routing
    audit_reasons: list[str]
    almacenamiento: StorageInfo
    almacenamiento_oci: None = None
    modo_ia: Literal["simulado"] = "simulado"

    @classmethod
    def from_domain(cls, triage: Triage) -> "TriageResponse":
        extraction, decision = triage.extraction, triage.decision
        return cls(
            documento_id=triage.document_id,
            status=decision.status,
            canal_origen=triage.channel,
            created_at=triage.created_at,
            clasificacion=Classification(
                tipo_documento=extraction.document_type,
                nivel_prioridad=extraction.priority,
                score_confianza_clasificacion=extraction.confidence,
            ),
            datos_extraidos=ExtractedData(
                paciente=Patient(nombre=extraction.patient_name, edad=extraction.patient_age)
            ),
            decision_enrutamiento=Routing(
                destino_principal=decision.destination,
                requiere_auditoria_humana=decision.status == Status.NEEDS_AUDIT,
                justificacion_enrutamiento=(
                    "Requiere revision humana"
                    if extraction.audit_reasons
                    else "Resultado de fixture sintetico para pruebas funcionales"
                ),
                alerta_urgente=decision.urgent_alert,
            ),
            audit_reasons=list(extraction.audit_reasons),
            almacenamiento=StorageInfo(ruta_objeto=triage.object_key),
        )


class HistoryResponse(BaseModel):
    items: list[TriageResponse]
    total: int
    offset: int
    limit: int
