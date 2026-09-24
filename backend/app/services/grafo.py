"""Punto de conexión con el grafo de IA (área de Cris y Franklin).

Por ahora es un stub: devuelve el resultado del ejemplo oficial sin llamar a ningún LLM.
Cuando el grafo real exista, se reemplaza el cuerpo de ejecutar_grafo y nada más.
"""

from app.schemas.triaje import (
    Clasificacion,
    DatosExtraidos,
    DecisionEnrutamiento,
    MedicoSolicitante,
    Notificacion,
    Paciente,
    ResultadoGrafo,
    TriajeRequest,
)


def ejecutar_grafo(documento: TriajeRequest) -> ResultadoGrafo:
    return ResultadoGrafo(
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
    )
