import type {
  CorreccionesRevision,
  DestinoPrincipal,
  DocumentoOriginal,
  HistoryResponse,
  ReviewEventResponse,
  ReviewRequest,
  StatusTriaje,
  TriajeDocumento,
} from "@/types/triaje";
import {
  frontendReviewDataset,
  frontendReviewDocumentIds,
} from "./frontendReview.ts";

export const fabricarPromesaTardia = <T>(
  dato: T,
  latencia: number,
  debeFallar: boolean,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    if (debeFallar) {
      reject(new Error("Hubo un error"));
    } else {
      setTimeout(() => {
        resolve(dato);
      }, latencia);
    }
  });
};

export async function mockTriajesConLatencia() {
  return fabricarPromesaTardia(structuredClone(mockTriajes), 1000, false);
}

export interface ParametrosHistorialMock {
  offset?: number;
  limit?: number;
  status?: StatusTriaje;
  destino?: DestinoPrincipal;
}

export async function mockHistorialConLatencia({
  offset = 0,
  limit = 20,
  status,
  destino,
}: ParametrosHistorialMock = {}): Promise<HistoryResponse> {
  const pageSize = Math.min(100, Math.max(1, Math.floor(limit)));
  const start = Math.max(0, Math.floor(offset));
  const filtrados = mockTriajes.filter(
    (documento) =>
      frontendReviewDocumentIds.has(documento.documento_id) &&
      (status === undefined || documento.status === status) &&
      (destino === undefined ||
        documento.decision_enrutamiento.destino_principal === destino),
  );
  return fabricarPromesaTardia(
    {
      items: structuredClone(filtrados.slice(start, start + pageSize)),
      total: filtrados.length,
      offset: start,
      limit: pageSize,
    },
    1000,
    false,
  );
}

export async function mockColaAuditoriaConLatencia(
  offset = 0,
  limit = 20,
): Promise<HistoryResponse> {
  return mockHistorialConLatencia({ offset, limit, status: "NEEDS_AUDIT" });
}

export async function mockDetalleTriajeConLatencia(
  documentId: string,
): Promise<TriajeDocumento> {
  if (!frontendReviewDocumentIds.has(documentId)) {
    throw new Error("Documento no existe en el dataset demo");
  }
  const history = await mockHistorialConLatencia({ limit: 100 });
  const detail = history.items.find((item) => item.documento_id === documentId);
  if (!detail) throw new Error("Documento no existe en el dataset demo");
  return detail;
}

export async function mockDocumentoOriginalConLatencia(
  documentId: string,
): Promise<DocumentoOriginal> {
  await mockDetalleTriajeConLatencia(documentId);
  throw new Error("El documento original no está disponible en modo demo");
}

export async function mockRevisionesConLatencia(
  documentId: string,
): Promise<ReviewEventResponse[]> {
  await mockDetalleTriajeConLatencia(documentId);
  return [];
}

const tiposDocumentales = new Set([
  "Informe de Laboratorio",
  "Informe de Imagenes",
  "Receta Medica",
  "Orden de Procedimiento",
  "Epicrisis",
  "Certificado Medico",
]);

const destinosFinales = new Set<DestinoPrincipal>([
  "HISTORIA_CLINICA",
  "EMERGENCIA_MEDICA",
  "FARMACIA",
  "AUDITORIA_AUTORIZACIONES",
]);

function validarMetadatosRevision(solicitud: ReviewRequest): void {
  if (
    typeof solicitud.revisor !== "string" ||
    solicitud.revisor.trim().length === 0 ||
    solicitud.revisor.trim().length > 100
  ) {
    throw new Error("El revisor es obligatorio y admite hasta 100 caracteres");
  }
  if (
    typeof solicitud.comentario !== "string" ||
    solicitud.comentario.trim().length === 0 ||
    solicitud.comentario.trim().length > 2000
  ) {
    throw new Error("El comentario es obligatorio y admite hasta 2000 caracteres");
  }
}

function validarCorrecciones(
  documento: TriajeDocumento,
  solicitud: ReviewRequest,
): CorreccionesRevision {
  const correcciones = solicitud.correcciones;
  if (!correcciones || typeof correcciones !== "object") {
    throw new Error("Corregir y aprobar requiere cambios permitidos");
  }

  const permitidas = new Set([
    "nombre_paciente",
    "edad_paciente",
    "tipo_documento",
    "nivel_prioridad",
  ]);
  const campos = Object.keys(correcciones);
  if (campos.length === 0 || campos.some((campo) => !permitidas.has(campo))) {
    throw new Error("La solicitud contiene correcciones no permitidas");
  }

  const efectivas: CorreccionesRevision = {};
  if (Object.hasOwn(correcciones, "nombre_paciente")) {
    const nombre = correcciones.nombre_paciente;
    if (typeof nombre !== "string" || nombre.trim().length === 0) {
      throw new Error("El nombre corregido no puede estar vacío");
    }
    if (nombre !== documento.datos_extraidos.paciente.nombre) {
      efectivas.nombre_paciente = nombre;
    }
  }
  if (Object.hasOwn(correcciones, "edad_paciente")) {
    const edad = correcciones.edad_paciente;
    if (
      edad !== null &&
      (typeof edad !== "number" ||
        !Number.isInteger(edad) ||
        edad < 0 ||
        edad > 130)
    ) {
      throw new Error("La edad corregida debe ser un entero entre 0 y 130 o null");
    }
    if (edad !== documento.datos_extraidos.paciente.edad) {
      efectivas.edad_paciente = edad;
    }
  }
  if (Object.hasOwn(correcciones, "tipo_documento")) {
    const tipo = correcciones.tipo_documento;
    if (typeof tipo !== "string" || !tiposDocumentales.has(tipo)) {
      throw new Error("El tipo documental corregido no está soportado");
    }
    if (tipo !== documento.clasificacion.tipo_documento) {
      efectivas.tipo_documento = tipo;
    }
  }
  if (Object.hasOwn(correcciones, "nivel_prioridad")) {
    const prioridad = correcciones.nivel_prioridad;
    if (prioridad !== "Rutina" && prioridad !== "Urgente") {
      throw new Error("El nivel de prioridad corregido no está soportado");
    }
    if (prioridad !== documento.clasificacion.nivel_prioridad) {
      efectivas.nivel_prioridad = prioridad;
    }
  }

  if (Object.keys(efectivas).length === 0) {
    throw new Error("La corrección requiere al menos un cambio efectivo");
  }
  return efectivas;
}

function validarDatosAprobados(
  documento: TriajeDocumento,
  solicitud: ReviewRequest,
  correcciones?: CorreccionesRevision,
): void {
  const destino = solicitud.destino;
  if (!destino || !destinosFinales.has(destino)) {
    throw new Error("Seleccioná un destino final válido");
  }
  if (!solicitud.destino || solicitud.destino === "REVISION_HUMANA") {
    throw new Error("La aprobación requiere un destino distinto de REVISION_HUMANA");
  }

  const nombre = correcciones?.nombre_paciente ?? documento.datos_extraidos.paciente.nombre;
  const tipo = correcciones?.tipo_documento ?? documento.clasificacion.tipo_documento;
  const prioridad = correcciones?.nivel_prioridad ?? documento.clasificacion.nivel_prioridad;
  if (!nombre?.trim()) {
    throw new Error("Para aprobar hace falta un nombre de paciente");
  }
  if (!tipo || !tiposDocumentales.has(tipo)) {
    throw new Error("Para aprobar elegí un tipo de documento confirmado");
  }
  if (prioridad !== "Rutina" && prioridad !== "Urgente") {
    throw new Error("Para aprobar elegí un nivel de prioridad");
  }
  if (prioridad === "Urgente" && destino !== "EMERGENCIA_MEDICA") {
    throw new Error("Los documentos urgentes deben dirigirse a EMERGENCIA_MEDICA");
  }
}

export const revisionDocumento = (
  documento_id: string,
  solicitud: ReviewRequest,
): Promise<TriajeDocumento> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const index = mockTriajes.findIndex(
          (documento) => documento.documento_id === documento_id,
        );
        if (index < 0) throw new Error("Documento no existe");

        const documento = mockTriajes[index];
        if (documento.status !== "NEEDS_AUDIT") {
          throw new Error("El documento ya está resuelto");
        }
        if (
          documento.processing_status !== "SUCCEEDED" &&
          documento.processing_status !== "FAILED"
        ) {
          throw new Error("El procesamiento todavía no terminó");
        }
        if (!solicitud || typeof solicitud !== "object") {
          throw new Error("La solicitud de revisión no es válida");
        }
        validarMetadatosRevision(solicitud);

        let nuevoStatus: StatusTriaje;
        let correcciones: CorreccionesRevision | undefined;
        if (solicitud.accion === "rechazar") {
          if (solicitud.destino !== undefined && solicitud.destino !== null) {
            throw new Error("El rechazo no admite destino");
          }
          if (solicitud.correcciones !== undefined) {
            throw new Error("El rechazo no admite correcciones");
          }
          nuevoStatus = "REJECTED";
        } else if (solicitud.accion === "aprobar") {
          if (solicitud.correcciones !== undefined) {
            throw new Error("La aprobación sin correcciones no admite campos corregidos");
          }
          validarDatosAprobados(documento, solicitud);
          nuevoStatus = "APPROVED";
        } else if (solicitud.accion === "corregir_aprobar") {
          correcciones = validarCorrecciones(documento, solicitud);
          validarDatosAprobados(documento, solicitud, correcciones);
          nuevoStatus = "APPROVED";
        } else {
          throw new Error("La acción de revisión no está soportada");
        }

        const actualizado: TriajeDocumento = {
          ...documento,
          status: nuevoStatus,
          clasificacion: {
            ...documento.clasificacion,
            ...(correcciones?.tipo_documento !== undefined
              ? { tipo_documento: correcciones.tipo_documento }
              : {}),
            ...(correcciones?.nivel_prioridad !== undefined
              ? { nivel_prioridad: correcciones.nivel_prioridad }
              : {}),
          },
          datos_extraidos: {
            ...documento.datos_extraidos,
            paciente: {
              ...documento.datos_extraidos.paciente,
              ...(correcciones && Object.hasOwn(correcciones, "nombre_paciente")
                ? { nombre: correcciones.nombre_paciente }
                : {}),
              ...(correcciones && Object.hasOwn(correcciones, "edad_paciente")
                ? { edad: correcciones.edad_paciente }
                : {}),
            },
          },
          decision_enrutamiento: {
            ...documento.decision_enrutamiento,
            ...(solicitud.accion === "rechazar"
              ? {}
              : { destino_principal: solicitud.destino! }),
            requiere_auditoria_humana: false,
          },
        };

        mockTriajes[index] = actualizado;
        resolve(structuredClone(actualizado));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Error al revisar documento"));
      }
    }, 1000);
  });
};

/**
 * Mutable mock state seeded from the portable frontend-review sample.
 * History endpoints expose that sample; a retained processed case preserves the
 * existing direct mock-review behavior without adding it to the portable dataset.
 */
export const mockTriajes: TriajeDocumento[] = [
  ...structuredClone(frontendReviewDataset.items),

  // Caso 3: variante de compatibilidad para conservar la revisión no auditable.
  // El contrato define PROCESSED como "resultado sin auditoría, no aprobación
  // clínica": ejemplo necesario para la vista "Todos los documentos" (flag false).
  {
    documento_id: "FRONTEND-PROCESADO-001",
    status: "PROCESSED",
    canal_origen: "web",
    created_at: "2026-10-08T12:00:00Z",
    clasificacion: {
      tipo_documento: "Informe de Laboratorio",
      especialidad: null,
      nivel_prioridad: "Rutina",
      score_confianza_clasificacion: null,
    },
    datos_extraidos: {
      paciente: { nombre: "Demo Sintético", edad: 30 },
      medico_solicitante: null,
      estudio_realizado: null,
      indicacion: null,
      diagnostico_principal: null,
      cie10_sugerido: null,
    },
    decision_enrutamiento: {
      destino_principal: "HISTORIA_CLINICA",
      requiere_auditoria_humana: false,
      justificacion_enrutamiento: "Resultado simulado sin auditoria",
      alerta_urgente: false,
      notificacion_generada: null,
    },
    audit_reasons: [],
    almacenamiento: {
      proveedor: "neon",
      ruta_objeto: "recibidos/00000000000000000000000000000003",
      status_backup: "exito",
    },
    almacenamiento_oci: null,
    modo_ia: "simulado",
    confianza_tipo: "fixture",
    processing_status: "SUCCEEDED",
    processing_error: null,
    extraction_schema_version: 2,
    extraction_provenance: {
      provider: "simulated",
      model: null,
      prompt_version: null,
    },
    extraction_evidence: [],
  },
];

/**
 * Referencia del estado RESULTANTE de una revisión aprobada
 * (fixture triaje_aprobado.json). No pertenece a la colección: el mismo
 * documento no puede existir dos veces; es el "después" que la revisión
 * del paso 2 debe producir para FRONTEND-REVISION-001.
 */
export const triajeAprobadoReferencia: TriajeDocumento = {
  documento_id: "FRONTEND-REVISION-001",
  status: "APPROVED",
  canal_origen: "web",
  created_at: "2026-10-08T12:00:00Z",
  clasificacion: {
    tipo_documento: "Informe de Laboratorio",
    especialidad: null,
    nivel_prioridad: "Rutina",
    score_confianza_clasificacion: null,
  },
  datos_extraidos: {
    paciente: { nombre: "Demo Sintético", edad: 30 },
    medico_solicitante: null,
    estudio_realizado: null,
    indicacion: null,
    diagnostico_principal: null,
    cie10_sugerido: null,
  },
  decision_enrutamiento: {
    destino_principal: "HISTORIA_CLINICA",
    requiere_auditoria_humana: false,
    justificacion_enrutamiento: "Decision registrada por revision humana",
    alerta_urgente: false,
    notificacion_generada: null,
  },
  audit_reasons: ["UNVERIFIED_BINARY_EVIDENCE", "GEMINI_REQUIRES_HUMAN_REVIEW"],
  almacenamiento: {
    proveedor: "neon",
    ruta_objeto: "recibidos/00000000000000000000000000000001",
    status_backup: "exito",
  },
  almacenamiento_oci: null,
  modo_ia: "gemini",
  confianza_tipo: "autodeclarada_modelo",
  processing_status: "SUCCEEDED",
  processing_error: null,
  extraction_schema_version: 2,
  extraction_provenance: {
    provider: "google-gemini",
    model: "gemini-3.5-flash-lite",
    prompt_version: "mediflow-extraction-v1",
  },
  extraction_evidence: [
    { field: "patient_name", page: 1, quote: "Paciente Demo Sintético" },
  ],
};
