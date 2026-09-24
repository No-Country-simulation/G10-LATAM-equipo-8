"""Contrato de POST /api/v1/triajes, tomado del ejemplo oficial del instructivo."""

from pydantic import BaseModel, Field


class TriajeRequest(BaseModel):
    documento_id: str = Field(min_length=1)
    tipo_archivo: str
    documento_texto: str = Field(min_length=1)
    canal_origen: str


class Clasificacion(BaseModel):
    tipo_documento: str
    especialidad: str
    nivel_prioridad: str
    score_confianza_clasificacion: float = Field(ge=0, le=1)


class Paciente(BaseModel):
    # El ejemplo oficial dice "nome" (typo en portugués); usamos "nombre" a propósito.
    nombre: str
    edad: int | None = None


class MedicoSolicitante(BaseModel):
    nombre: str
    matricula: str


class DatosExtraidos(BaseModel):
    paciente: Paciente
    medico_solicitante: MedicoSolicitante
    estudio_realizado: str | None = None
    diagnostico_principal: str | None = None
    cie10_sugerido: str | None = None


class Notificacion(BaseModel):
    canal: str
    mensaje: str


class DecisionEnrutamiento(BaseModel):
    destino_principal: str
    requiere_auditoria_humana: bool
    justificacion_enrutamiento: str
    notificacion_generada: Notificacion | None = None


class AlmacenamientoOci(BaseModel):
    bucket: str
    ruta_objeto: str
    status_backup: str


class ResultadoGrafo(BaseModel):
    """Lo que el grafo de IA devuelve: contrato con el área de IA."""

    clasificacion: Clasificacion
    datos_extraidos: DatosExtraidos
    decision_enrutamiento: DecisionEnrutamiento


class TriajeResponse(BaseModel):
    status: str
    documento_id: str
    clasificacion: Clasificacion
    datos_extraidos: DatosExtraidos
    decision_enrutamiento: DecisionEnrutamiento
    almacenamiento_oci: AlmacenamientoOci
