import type { TriajeDocumento } from "@/types/triaje";

export const mockTriajes: TriajeDocumento[] = [
  // Primer Caso
  {
    documento_id: "DOC-CLIN-2026-001",
    status: "pendiente_revision",
    fecha_ingesta: "2026-10-27",
    clasificacion: {
      tipo_documento: "Receta Médica",
      especialidad: "Medicina General",
      nivel_prioridad: "Media",
      score_confianza_clasificacion: 0.68,
    },
    datos_extraidos: {
      paciente: { nombre: "Laura Fernández", edad: 34 },
      medico_solicitante: {
        nombre: "Dr. Roberto Gómez",
        matricula: "MN-48291",
      },
      diagnostico_principal: "Faringitis Aguda",
      cie10_sugerido: "J02.9",
      motivo_alerta: "Dosis Ambigua - Amoxicilina 1000g en lugar de 1000mg",
    },
    decision_enrutamiento: {
      destino_principal: "Cola_Revision_Humana",
      requiere_auditoria_humana: true,
      justificacion_enrutamiento:
        "Prescripción con dosis 1000 veces superior al límite seguro. Requiere confirmación facultativa.",
    },
    almacenamiento_oci: {
      bucket: "mediflow-documentos-clinicos",
      ruta_objeto: "auditoria_humana/DOC-CLIN-2026-001.json",
      status_backup: "exito",
    },
  },

  //   Segundo Caso
  {
    documento_id: "DOC-CLIN-2026-002",
    status: "procesado",
    fecha_ingesta: "2026-10-28",
    clasificacion: {
      tipo_documento: "Receta Médica",
      especialidad: "Medicina General",
      nivel_prioridad: "Baja",
      score_confianza_clasificacion: 0.99,
    },
    datos_extraidos: {
      paciente: { nombre: "Jose Mamonsiño", edad: 30 },
      medico_solicitante: {
        nombre: "Dr. Roberto Gómez",
        matricula: "MN-48291",
      },
      diagnostico_principal: "Faringitis Aguda",
      cie10_sugerido: "J02.9",
    },
    decision_enrutamiento: {
      destino_principal: "Farmacia_Hospitalaria",
      requiere_auditoria_humana: false,
      justificacion_enrutamiento: "Prescripción receta medica",
    },
    almacenamiento_oci: {
      bucket: "mediflow-documentos-clinicos",
      ruta_objeto: "auditoria_humana/DOC-CLIN-2026-002.json",
      status_backup: "exito",
    },
  },

  //   Tercer Caso
  {
    documento_id: "DOC-CLIN-2026-003",
    status: "procesado",
    fecha_ingesta: "2026-10-29",
    clasificacion: {
      tipo_documento: "Informe de Estudio por Imagenes",
      especialidad: "Radiologia / Neumologia",
      nivel_prioridad: "Urgente",
      score_confianza_clasificacion: 0.99,
    },
    datos_extraidos: {
      paciente: { nombre: "Carlos Eduardo Mendes", edad: 52 },
      medico_solicitante: {
        nombre: "Dra. Renata Silveira",
        matricula: "145892",
      },
      estudio_realizado: "Tomografía de Torax con contraste",
      diagnostico_principal: "Tromboembolismo Pulmonar Agudo (TEP)",
      cie10_sugerido: "I26.9",
    },
    decision_enrutamiento: {
      destino_principal: "Cola_Emergencia_Medica",
      requiere_auditoria_humana: false,
      justificacion_enrutamiento:
        "Hallazgo critico de alta gravedad (TEP agudo) detectado en paciente sintomatico.",
    },
    almacenamiento_oci: {
      bucket: "mediflow-documentos-clinicos",
      ruta_objeto: "auditoria_humana/DOC-CLIN-2026-003.json",
      status_backup: "exito",
    },
  },
  //   Cuarto Caso
  {
    documento_id: "DOC-CLIN-2026-004",
    status: "pendiente_revision",
    fecha_ingesta: "2026-10-30",
    clasificacion: {
      tipo_documento: "Receta Médica",
      especialidad: "Medicina General",
      nivel_prioridad: "Baja",
      score_confianza_clasificacion: 0.6,
    },
    datos_extraidos: {
      paciente: { nombre: "Carlos Bodoque", edad: 20 },
      medico_solicitante: {
        nombre: "Dr. Roberto Gómez",
        matricula: "ILEGIBLE",
      },
      diagnostico_principal: "Bronquitis",
      cie10_sugerido: "I26.0",
      motivo_alerta: "Matrícula Médica Ilegible",
    },
    decision_enrutamiento: {
      destino_principal: "Cola_Revision_Humana",
      requiere_auditoria_humana: true,
      justificacion_enrutamiento: "Bronquitis.",
    },
    almacenamiento_oci: {
      bucket: "mediflow-documentos-clinicos",
      ruta_objeto: "auditoria_humana/DOC-CLIN-2026-004.json",
      status_backup: "exito",
    },
  },
];
