// Synthetic DTO fixture; it is not evidence of an original document.
export function syntheticDocument(overrides = {}) {
  const document = {
    documento_id: "SYNTHETIC-REVIEW-1",
    status: "NEEDS_AUDIT",
    canal_origen: "web",
    created_at: "2026-10-08T12:00:00Z",
    clasificacion: {
      tipo_documento: "Orden de Procedimiento",
      especialidad: null,
      nivel_prioridad: "Rutina",
      score_confianza_clasificacion: 0.73,
    },
    datos_extraidos: {
      paciente: { nombre: "Paciente Sintético", edad: 0 },
      medico_solicitante: { nombre: null, matricula: null },
      estudio_realizado: "Estudio original",
      indicacion: null,
      diagnostico_principal: "Diagnóstico de ejemplo",
      cie10_sugerido: null,
    },
    decision_enrutamiento: {
      destino_principal: "REVISION_HUMANA",
      requiere_auditoria_humana: true,
      justificacion_enrutamiento: "Dato de prueba sintético",
      alerta_urgente: false,
      notificacion_generada: null,
    },
    audit_reasons: ["SYNTHETIC_REASON"],
    almacenamiento: {
      proveedor: "local",
      ruta_objeto: "internal/synthetic-key",
      status_backup: "exito",
    },
    almacenamiento_oci: null,
    modo_ia: "simulado",
    confianza_tipo: "fixture",
    processing_status: "SUCCEEDED",
    processing_error: null,
    extraction_schema_version: 2,
    extraction_provenance: {
      provider: "synthetic-provider",
      model: null,
      prompt_version: null,
    },
    extraction_evidence: [],
  };
  return {
    ...document,
    ...overrides,
    clasificacion: { ...document.clasificacion, ...overrides.clasificacion },
    datos_extraidos: {
      ...document.datos_extraidos,
      ...overrides.datos_extraidos,
      paciente: {
        ...document.datos_extraidos.paciente,
        ...overrides.datos_extraidos?.paciente,
      },
      medico_solicitante:
        overrides.datos_extraidos?.medico_solicitante === undefined
          ? document.datos_extraidos.medico_solicitante
          : overrides.datos_extraidos.medico_solicitante,
    },
    decision_enrutamiento: {
      ...document.decision_enrutamiento,
      ...overrides.decision_enrutamiento,
    },
  };
}
