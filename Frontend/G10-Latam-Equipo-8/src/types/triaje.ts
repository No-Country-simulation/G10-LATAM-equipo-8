/**
 * Contrato de tipos backend↔frontend de MediFlow.
 * Fuente de verdad: docs/CONTRATO_API_FRONTEND.md (commit b4180ec, snapshot 9f6df98).
 * Convención: espejo fiel del JSON — nombres snake_case tal como llegan,
 * null explícito = "no disponible" (renderizar como tal, nunca completar con 0 ni "").
 */

// ─── Enumeraciones del contrato ─────────────────────────────────────────────

/** Estado de revisión/decisión humana. Separado del estado técnico de procesamiento. */
export type StatusTriaje =
  | "PROCESSED"
  | "NEEDS_AUDIT"
  | "APPROVED"
  | "REJECTED";

/** Estado técnico del procesamiento (proveedor IA). Independiente del status humano. */
export type EstadoProcesamiento =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

/** Prioridad clínica informada. La nullabilidad vive en el campo, no aquí. */
export type NivelPrioridad = "Rutina" | "Urgente";

/** Destinos de enrutamiento registrados. No interpretar como envío realizado. */
export type DestinoPrincipal =
  | "HISTORIA_CLINICA"
  | "EMERGENCIA_MEDICA"
  | "REVISION_HUMANA"
  | "FARMACIA"
  | "AUDITORIA_AUTORIZACIONES";

/** Procedencia del resultado de IA. */
export type ModoIA = "simulado" | "gemini" | "desconocido";

/** Clase de confianza reportada. */
export type ConfianzaTipo = "fixture" | "autodeclarada_modelo" | "desconocida";

/** Proveedor de almacenamiento del original; OCI se informa aquí. */
export type ProveedorAlmacenamiento = "local" | "neon" | "oci";

/** Acciones de revisión humana admitidas por el backend. */
export type AccionRevision = "aprobar" | "corregir_aprobar" | "rechazar";

// ─── Clasificación y datos extraídos ────────────────────────────────────────

export interface Paciente {
  nombre: string | null;
  /** Entero estricto; rango técnico actual 0..130. */
  edad: number | null;
}

/** Objeto completo nullable: el backend puede omitirlo por entero. */
export interface MedicoSolicitante {
  nombre: string | null;
  matricula: string | null;
}

export interface ClasificacionDocumento {
  /**
   * string|null a propósito: el backend puede enviar el sentinel "No determinado"
   * o valores nuevos. NO tipar como unión estricta de los 6 tipos conocidos.
   */
  tipo_documento: string | null;
  /** Campo reservado; null actualmente. */
  especialidad: string | null;
  nivel_prioridad: NivelPrioridad | null;
  /** Autodeclarado por el modelo; no es precisión medida ni calibrada. */
  score_confianza_clasificacion: number | null;
}

export interface DatosExtraidos {
  paciente: Paciente;
  medico_solicitante: MedicoSolicitante | null;
  estudio_realizado: string | null;
  indicacion: string | null;
  diagnostico_principal: string | null;
  /** Sugerencia técnica, no código validado. */
  cie10_sugerido: string | null;
}

// ─── Decisión y almacenamiento ──────────────────────────────────────────────

export interface DecisionEnrutamiento {
  destino_principal: DestinoPrincipal;
  /** true ⇔ status es NEEDS_AUDIT. La calcula el backend; la UI solo la obedece. */
  requiere_auditoria_humana: boolean;
  justificacion_enrutamiento: string;
  /** Alerta urgente independiente; no significa autorización ni envío. */
  alerta_urgente: boolean;
  /** Siempre null en la respuesta pública: no hay dispatcher ni señal de entrega; PostgreSQL persiste internamente la intención pendiente. */
  notificacion_generada: null;
}

export interface Almacenamiento {
  proveedor: ProveedorAlmacenamiento;
  /** Clave interna del original; NO es URL pública ni endpoint del frontend. */
  ruta_objeto: string;
  /** El contrato lo documenta como "exito" hoy; ampliar si el contrato crece. */
  status_backup: "exito";
}

// ─── Proveniencia y evidencia (se consume en P3: detalle/visor) ─────────────

export interface EvidenciaExtraccion {
  /** Nombre interno en inglés: document_type, priority, patient_name, etc. */
  field: string;
  page: number | null;
  /** Afirmación de fuente; no es veracidad clínica ni diagnóstico validado. */
  quote: string | null;
}

export interface ProvenienciaExtraccion {
  provider: string;
  model: string | null;
  prompt_version: string | null;
}

// ─── Triaje (TriageResponse del contrato) ───────────────────────────────────

export interface TriajeDocumento {
  /** ID público: usarlo en las rutas del API, nunca ruta_objeto. */
  documento_id: string;
  status: StatusTriaje;
  canal_origen: string;
  /** Fecha UTC ISO 8601. */
  created_at: string;
  clasificacion: ClasificacionDocumento;
  datos_extraidos: DatosExtraidos;
  decision_enrutamiento: DecisionEnrutamiento;
  /** Motivos de auditoría; mostrar códigos desconocidos sin romper la UI. */
  audit_reasons: string[];
  almacenamiento: Almacenamiento;
  /** Siempre null; OCI se informa mediante almacenamiento.proveedor. */
  almacenamiento_oci: null;
  modo_ia: ModoIA;
  confianza_tipo: ConfianzaTipo;
  processing_status: EstadoProcesamiento;
  /** Código técnico seguro, no excepción cruda. */
  processing_error: string | null;
  extraction_schema_version: number;
  extraction_provenance: ProvenienciaExtraccion;
  extraction_evidence: EvidenciaExtraccion[];
}

// ─── Historial (HistoryResponse del contrato) ───────────────────────────────

/** Sobre de paginación del historial: NO es un array suelto. */
export interface HistoryResponse {
  items: TriajeDocumento[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Revisión humana (ReviewRequest del contrato) ───────────────────────────

/**
 * Campos corregibles; omitir = no cambiar. Solo edad admite null explícito
 * (significa "borrar el valor"). El backend rechaza extras con 422.
 */
export interface CorreccionesRevision {
  nombre_paciente?: string;
  edad_paciente?: number | null;
  tipo_documento?: string;
  nivel_prioridad?: NivelPrioridad;
}

/** revisor y comentario obligatorios. Al aprobar, destino obligatorio (≠ REVISION_HUMANA). */
export interface ReviewRequest {
  accion: AccionRevision;
  revisor: string;
  comentario: string;
  destino?: DestinoPrincipal | null;
  correcciones?: CorreccionesRevision;
}

export interface SnapshotRevision {
  document_type: string | null;
  priority: NivelPrioridad | null;
  confidence: number | null;
  patient_name: string | null;
  patient_age: number | null;
  audit_reasons: string[];
  schema_version: number;
  professional_name: string | null;
  professional_registration: string | null;
  study: string | null;
  indication: string | null;
  diagnosis: string | null;
  cie10_suggested: string | null;
  evidence: EvidenciaExtraccion[];
}

export interface CorreccionEventoRevision {
  field: string;
  before: string | number | null;
  after: string | number | null;
}

/** Event shape returned by GET /api/v1/triajes/{documento_id}/revisiones. */
export interface ReviewEventResponse {
  review_id: string;
  document_id: string;
  action: AccionRevision;
  reviewer: string;
  comment: string;
  created_at: string;
  previous_status: StatusTriaje;
  new_status: StatusTriaje;
  previous_destination: DestinoPrincipal;
  new_destination: DestinoPrincipal;
  before: SnapshotRevision;
  after: SnapshotRevision;
  corrections: CorreccionEventoRevision[];
}

/** Binary original returned by the document endpoint; MIME/name come from HTTP headers. */
export interface DocumentoOriginal {
  blob: Blob;
  contentType: string | null;
  filename?: string;
}