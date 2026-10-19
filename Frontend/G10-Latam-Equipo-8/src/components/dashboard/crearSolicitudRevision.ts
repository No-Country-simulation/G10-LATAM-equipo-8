import type {
  AccionRevision,
  CorreccionesRevision,
  DestinoPrincipal,
  NivelPrioridad,
  ReviewRequest,
  TriajeDocumento,
} from "@/types/triaje";

export interface CamposFormularioRevision {
  revisor: string;
  comentario: string;
  destino: string;
  nombrePaciente: string;
  edadPaciente: string;
  borrarEdad: boolean;
  tipoDocumento: string;
  nivelPrioridad: string;
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

function normalizarEdad(campos: CamposFormularioRevision): number | null | undefined {
  if (campos.borrarEdad) return null;
  if (campos.edadPaciente.trim() === "") return undefined;

  const edad = Number(campos.edadPaciente);
  if (!Number.isInteger(edad) || edad < 0 || edad > 130) {
    throw new Error("La edad debe ser un entero entre 0 y 130");
  }
  return edad;
}

function validarAprobacion(
  documento: TriajeDocumento,
  destino: DestinoPrincipal,
  correcciones?: CorreccionesRevision,
): void {
  const nombre = correcciones?.nombre_paciente ?? documento.datos_extraidos.paciente.nombre;
  const tipo = correcciones?.tipo_documento ?? documento.clasificacion.tipo_documento;
  const prioridad = correcciones?.nivel_prioridad ?? documento.clasificacion.nivel_prioridad;

  if (!nombre?.trim()) {
    throw new Error("Para aprobar hace falta un nombre de paciente");
  }
  if (!tipo || !tiposDocumentales.has(tipo)) {
    throw new Error("Para aprobar elegí un tipo de documento confirmado");
  }
  if (!prioridad) {
    throw new Error("Para aprobar elegí un nivel de prioridad");
  }
  if (prioridad === "Urgente" && destino !== "EMERGENCIA_MEDICA") {
    throw new Error("Los documentos urgentes deben dirigirse a EMERGENCIA_MEDICA");
  }
}

function validarFormulario(campos: CamposFormularioRevision): {
  revisor: string;
  comentario: string;
} {
  const revisor = campos.revisor.trim();
  const comentario = campos.comentario.trim();

  if (!revisor || revisor.length > 100) {
    throw new Error("El revisor es obligatorio y admite hasta 100 caracteres");
  }
  if (!comentario || comentario.length > 2000) {
    throw new Error("El comentario es obligatorio y admite hasta 2000 caracteres");
  }
  return { revisor, comentario };
}

function validarDocumentoRevisable(documento: TriajeDocumento): void {
  if (documento.status !== "NEEDS_AUDIT") {
    throw new Error("El documento no está pendiente de auditoría");
  }
  if (
    documento.processing_status !== "SUCCEEDED" &&
    documento.processing_status !== "FAILED"
  ) {
    throw new Error("El procesamiento todavía no terminó");
  }
}

export function crearSolicitudRevision(
  accion: AccionRevision,
  campos: CamposFormularioRevision,
  documento: TriajeDocumento,
): ReviewRequest {
  validarDocumentoRevisable(documento);
  const { revisor, comentario } = validarFormulario(campos);

  if (accion === "rechazar") {
    return { accion, revisor, comentario };
  }

  const destino = campos.destino as DestinoPrincipal;
  if (!destinosFinales.has(destino)) {
    throw new Error("Seleccioná un destino final válido");
  }

  if (accion === "aprobar") {
    validarAprobacion(documento, destino);
    return { accion, revisor, comentario, destino };
  }

  const correcciones: CorreccionesRevision = {};
  const nombre = campos.nombrePaciente.trim();
  if (nombre && nombre !== documento.datos_extraidos.paciente.nombre) {
    correcciones.nombre_paciente = nombre;
  }

  const edad = normalizarEdad(campos);
  if (edad !== undefined && edad !== documento.datos_extraidos.paciente.edad) {
    correcciones.edad_paciente = edad;
  }

  const tipo = campos.tipoDocumento.trim();
  if (tipo) {
    if (!tiposDocumentales.has(tipo)) {
      throw new Error("El tipo documental no está soportado");
    }
    if (tipo !== documento.clasificacion.tipo_documento) {
      correcciones.tipo_documento = tipo;
    }
  }

  let prioridad: NivelPrioridad | undefined;
  if (campos.nivelPrioridad.trim()) {
    if (campos.nivelPrioridad !== "Rutina" && campos.nivelPrioridad !== "Urgente") {
      throw new Error("El nivel de prioridad no está soportado");
    }
    prioridad = campos.nivelPrioridad;
    if (prioridad !== documento.clasificacion.nivel_prioridad) {
      correcciones.nivel_prioridad = prioridad;
    }
  }

  if (Object.keys(correcciones).length === 0) {
    throw new Error("La corrección requiere al menos un cambio efectivo");
  }

  validarAprobacion(documento, destino, correcciones);
  return { accion, revisor, comentario, destino, correcciones };
}
