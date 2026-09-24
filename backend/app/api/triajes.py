"""Endpoints de triaje de documentos clínicos."""

from fastapi import APIRouter

from app.schemas.triaje import (
    AlmacenamientoOci,
    Clasificacion,
    DatosExtraidos,
    DecisionEnrutamiento,
    MedicoSolicitante,
    Notificacion,
    Paciente,
    TriajeRequest,
    TriajeResponse,
)

router = APIRouter(prefix="/triajes", tags=["triajes"])


@router.post("", response_model=TriajeResponse)
def crear_triaje(payload: TriajeRequest) -> TriajeResponse:
    # Respuesta fija del ejemplo oficial: deja el contrato listo para el frontend
    # mientras el agente real no existe. Solo documento_id sale del pedido.
    return TriajeResponse(
        status="procesado",
        documento_id=payload.documento_id,
        clasificacion=Clasificacion(
            tipo_documento="Informe de Estudio por Imagenes",
            especialidad="Radiologia / Neumonologia",
            nivel_prioridad="Urgente",
            score_confianza_clasificacion=0.99,
        ),
        datos_extraidos=DatosExtraidos(
            paciente=Paciente(nombre="Carlos Eduardo Mendes", edad=52),
            medico_solicitante=MedicoSolicitante(nombre="Dra. Renata Silveira", matricula="145892"),
            estudio_realizado="Tomografia de Torax con contraste",
            diagnostico_principal="Tromboembolismo Pulmonar Agudo (TEP)",
            cie10_sugerido="I26.9",
        ),
        decision_enrutamiento=DecisionEnrutamiento(
            destino_principal="Cola_Emergencia_Medica",
            requiere_auditoria_humana=False,
            justificacion_enrutamiento="Hallazgo critico de alta gravedad (TEP agudo) detectado en paciente sintomatico.",
            notificacion_generada=Notificacion(
                canal="Alerta_Guardia_Medica",
                mensaje="ALERTA URGENTE: Informe critico de TEP Agudo para el paciente Carlos Eduardo Mendes en Guardia de Emergencias.",
            ),
        ),
        almacenamiento_oci=AlmacenamientoOci(
            bucket="mediflow-documentos-clinicos",
            ruta_objeto=f"procesados/urgentes/{payload.documento_id}.json",
            status_backup="exito",
        ),
    )
