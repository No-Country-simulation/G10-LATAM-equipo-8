import type {
  AccionRevision,
  CorreccionesRevision,
  DestinoPrincipal,
  ReviewRequest,
  TriajeDocumento,
} from "../types/triaje";
import {
  buildCorrectionProposal,
  reviewEligibility,
  type ReviewDraft,
} from "../components/dashboard/reviewDraft.ts";

export type ReviewDecisionField = "reviewer" | "comment" | "destination";
export type FinalReviewDestination = Exclude<DestinoPrincipal, "REVISION_HUMANA">;

export interface ReviewDecisionForm {
  reviewer: string;
  comment: string;
  destination: FinalReviewDestination | "";
  verified: boolean;
}

export type ReviewDecisionPhase =
  | "idle"
  | "submitting"
  | "reloading-conflict"
  | "error"
  | "conflict"
  | "uncertain"
  | "confirmed"
  | "confirmed-refresh-error";

export interface ReviewDecisionSnapshot {
  form: ReviewDecisionForm;
  phase: ReviewDecisionPhase;
  error: string | null;
  rejectionConfirmationOpen: boolean;
  latestDocument: TriajeDocumento | null;
}

export interface ReviewDecisionService {
  revisarDocumento(documentId: string, request: ReviewRequest): Promise<TriajeDocumento>;
  getDetalleTriaje(documentId: string): Promise<TriajeDocumento>;
}

export interface DocumentReviewCollectionRefreshError {
  decisionConfirmed: boolean;
  message: string;
}

export interface DocumentReviewDecisionCallbacks {
  refreshCollections: () => Promise<void>;
  onDecisionConfirmed?: (document: TriajeDocumento) => void;
  onCollectionRefreshError?: (error: DocumentReviewCollectionRefreshError) => void;
}

export interface DocumentReviewDecisionController {
  getSnapshot: () => ReviewDecisionSnapshot;
  subscribe: (listener: () => void) => () => void;
  setField: (field: ReviewDecisionField, value: string) => void;
  setVerified: (verified: boolean) => void;
  invalidateVerification: () => void;
  requestRejection: () => void;
  cancelRejection: () => void;
  approve: (document: TriajeDocumento, draft: ReviewDraft) => Promise<void>;
  confirmRejection: (document: TriajeDocumento) => Promise<void>;
}

const finalDestinations = new Set<FinalReviewDestination>([
  "HISTORIA_CLINICA",
  "EMERGENCIA_MEDICA",
  "FARMACIA",
  "AUDITORIA_AUTORIZACIONES",
]);

const supportedDocumentTypes = new Set([
  "Informe de Laboratorio",
  "Informe de Imagenes",
  "Receta Medica",
  "Orden de Procedimiento",
  "Epicrisis",
  "Certificado Medico",
]);

function initialSnapshot(): ReviewDecisionSnapshot {
  return {
    form: { reviewer: "", comment: "", destination: "", verified: false },
    phase: "idle",
    error: null,
    rejectionConfirmationOpen: false,
    latestDocument: null,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "No se pudo completar esta solicitud.";
}

function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = error.status;
  return typeof status === "number" ? status : null;
}

function isLocked(phase: ReviewDecisionPhase): boolean {
  return (
    phase === "submitting" ||
    phase === "reloading-conflict" ||
    phase === "conflict" ||
    phase === "uncertain" ||
    phase === "confirmed" ||
    phase === "confirmed-refresh-error"
  );
}

function reviewIsTerminal(document: TriajeDocumento): boolean {
  return (
    document.status === "NEEDS_AUDIT" &&
    (document.processing_status === "SUCCEEDED" ||
      document.processing_status === "FAILED")
  );
}

function validateReviewerAndComment(form: ReviewDecisionForm): {
  reviewer: string;
  comment: string;
} {
  const reviewer = form.reviewer.trim();
  const comment = form.comment.trim();
  if (!reviewer || reviewer.length > 100) {
    throw new Error("El revisor es obligatorio y admite hasta 100 caracteres");
  }
  if (!comment || comment.length > 2000) {
    throw new Error("El comentario es obligatorio y admite hasta 2000 caracteres");
  }
  return { reviewer, comment };
}

function validateReviewable(document: TriajeDocumento): void {
  if (document.status !== "NEEDS_AUDIT") {
    throw new Error("El documento no está pendiente de auditoría");
  }
  if (!reviewIsTerminal(document)) {
    throw new Error("El procesamiento todavía no terminó");
  }
}

export function buildSupportedReviewCorrections(
  document: TriajeDocumento,
  draft: ReviewDraft,
): CorreccionesRevision {
  const corrections = buildCorrectionProposal(document, draft);
  const proposedName = corrections.nombre_paciente;
  if (proposedName !== undefined) {
    const normalizedName = proposedName.trim();
    if (normalizedName === document.datos_extraidos.paciente.nombre) {
      delete corrections.nombre_paciente;
    } else {
      corrections.nombre_paciente = normalizedName;
    }
  }
  return corrections;
}

function validateDraftCorrections(
  document: TriajeDocumento,
  draft: ReviewDraft,
): CorreccionesRevision {
  const originalName = document.datos_extraidos.paciente.nombre;
  const originalAge = document.datos_extraidos.paciente.edad;
  const originalType = document.clasificacion.tipo_documento;
  const originalPriority = document.clasificacion.nivel_prioridad;

  if (draft.patientName !== (originalName ?? "") && !draft.patientName.trim()) {
    throw new Error("El nombre del paciente no admite un valor vacío");
  }
  if (
    draft.documentType !== (originalType ?? "") &&
    !draft.documentType.trim()
  ) {
    throw new Error("El tipo de documento no admite un valor vacío");
  }
  if (draft.documentType.trim() && !supportedDocumentTypes.has(draft.documentType)) {
    throw new Error("El tipo de documento no está soportado");
  }
  if (
    draft.priority !== (originalPriority ?? "") &&
    draft.priority === ""
  ) {
    throw new Error("La prioridad no admite un valor vacío");
  }
  if (draft.priority !== "" && draft.priority !== "Rutina" && draft.priority !== "Urgente") {
    throw new Error("La prioridad no está soportada");
  }

  const ageText = draft.patientAge.trim();
  if (draft.ageExplicitlyCleared) {
    if (draft.patientAge !== "") {
      throw new Error("La edad nula requiere una propuesta de borrado explícita");
    }
  } else if (ageText === "" && originalAge !== null) {
    throw new Error("Para quitar la edad, usa la acción explícita de valor nulo");
  } else if (ageText !== "") {
    const age = Number(ageText);
    if (!Number.isInteger(age) || age < 0 || age > 130) {
      throw new Error("La edad debe ser un entero entre 0 y 130");
    }
  }

  return buildSupportedReviewCorrections(document, draft);
}

function buildApprovalRequest(
  document: TriajeDocumento,
  draft: ReviewDraft,
  form: ReviewDecisionForm,
): ReviewRequest {
  validateReviewable(document);
  if (reviewEligibility(document).state !== "ready") {
    throw new Error("No se puede aprobar sin una extracción verificable");
  }
  const { reviewer, comment } = validateReviewerAndComment(form);
  if (!form.destination || !finalDestinations.has(form.destination)) {
    throw new Error("Selecciona un destino final válido para aprobar");
  }
  if (!form.verified) {
    throw new Error("Verifica la decisión después de completar los datos requeridos");
  }

  const corrections = validateDraftCorrections(document, draft);
  const patientName = corrections.nombre_paciente ?? document.datos_extraidos.paciente.nombre;
  const documentType = corrections.tipo_documento ?? document.clasificacion.tipo_documento;
  const priority = corrections.nivel_prioridad ?? document.clasificacion.nivel_prioridad;

  if (!patientName?.trim()) {
    throw new Error("Para aprobar hace falta un nombre de paciente");
  }
  if (!documentType || !supportedDocumentTypes.has(documentType)) {
    throw new Error("Para aprobar hace falta un tipo de documento confirmado");
  }
  if (!priority) {
    throw new Error("Para aprobar hace falta una prioridad conocida");
  }
  if (priority === "Urgente" && form.destination !== "EMERGENCIA_MEDICA") {
    throw new Error("La prioridad Urgente exige el destino EMERGENCIA_MEDICA");
  }

  const accion: AccionRevision = Object.keys(corrections).length
    ? "corregir_aprobar"
    : "aprobar";
  return {
    accion,
    revisor: reviewer,
    comentario: comment,
    destino: form.destination,
    ...(accion === "corregir_aprobar" ? { correcciones: corrections } : {}),
  };
}

function buildRejectionRequest(
  document: TriajeDocumento,
  form: ReviewDecisionForm,
): ReviewRequest {
  validateReviewable(document);
  const { reviewer, comment } = validateReviewerAndComment(form);
  return { accion: "rechazar", revisor: reviewer, comentario: comment };
}

export function isReviewDecisionDirty(snapshot: ReviewDecisionSnapshot): boolean {
  const { form } = snapshot;
  return (
    form.reviewer !== "" ||
    form.comment !== "" ||
    form.destination !== "" ||
    form.verified ||
    snapshot.rejectionConfirmationOpen
  );
}

export function canRejectDocument(document: TriajeDocumento): boolean {
  return reviewIsTerminal(document);
}

export function createDocumentReviewDecisionController(
  service: ReviewDecisionService,
  callbacks: DocumentReviewDecisionCallbacks,
): DocumentReviewDecisionController {
  let snapshot = initialSnapshot();
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function publish(update: Partial<ReviewDecisionSnapshot>) {
    snapshot = { ...snapshot, ...update };
    for (const listener of [...listeners]) listener();
  }

  function setActionError(error: unknown) {
    publish({ phase: "error", error: errorMessage(error), latestDocument: null });
  }

  async function resolveConflict(documentId: string, originalError: unknown) {
    publish({
      phase: "reloading-conflict",
      error: "El servidor indicó que la revisión cambió. Se vuelve a leer el documento.",
    });

    let latestDocument: TriajeDocumento;
    try {
      latestDocument = await service.getDetalleTriaje(documentId);
    } catch (readError) {
      publish({
        phase: "conflict",
        error: `La decisión no se confirmó (${errorMessage(originalError)}). No se pudo volver a leer el documento: ${errorMessage(readError)}`,
        latestDocument: null,
      });
      return;
    }

    let refreshError: string | null = null;
    try {
      await callbacks.refreshCollections();
    } catch (error) {
      refreshError = errorMessage(error);
      callbacks.onCollectionRefreshError?.({
        decisionConfirmed: false,
        message: refreshError,
      });
    }

    publish({
      phase: "conflict",
      error: refreshError
        ? `La decisión no se confirmó (${errorMessage(originalError)}). Se volvió a leer el documento, pero no se actualizaron las colecciones: ${refreshError}`
        : `La decisión no se confirmó (${errorMessage(originalError)}). El documento y las colecciones se volvieron a leer; revisa el estado antes de cerrar.`,
      latestDocument,
    });
  }

  async function sendRequest(
    documentId: string,
    request: ReviewRequest,
  ): Promise<void> {
    publish({ phase: "submitting", error: null, latestDocument: null });
    const operation = (async () => {
      let result: TriajeDocumento;
      try {
        result = await service.revisarDocumento(documentId, request);
      } catch (error) {
        if (httpStatus(error) === 409) {
          await resolveConflict(documentId, error);
          return;
        }

        const status = httpStatus(error);
        if (status === null || status >= 500) {
          publish({
            phase: "uncertain",
            error: `No se pudo confirmar la decisión: ${errorMessage(error)}. No se repetirá automáticamente; vuelve a leer el documento antes de otra acción.`,
          });
          return;
        }
        setActionError(error);
        return;
      }

      publish({
        phase: "confirmed",
        error: null,
        rejectionConfirmationOpen: false,
      });
      try {
        callbacks.onDecisionConfirmed?.(result);
      } catch {
        // The server has confirmed the decision; a view callback cannot undo that fact.
      }
      try {
        await callbacks.refreshCollections();
      } catch (error) {
        const message = errorMessage(error);
        publish({ phase: "confirmed-refresh-error", error: message });
        callbacks.onCollectionRefreshError?.({
          decisionConfirmed: true,
          message,
        });
      }
    })();

    const pending = operation.finally(() => {
      inFlight = null;
    });
    inFlight = pending;
    return pending;
  }

  function readyForSubmission(): boolean {
    if (inFlight || isLocked(snapshot.phase)) return false;
    if (snapshot.phase === "error") publish({ phase: "idle", error: null });
    return true;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setField(field, value) {
      if (inFlight || isLocked(snapshot.phase)) return;
      const destination =
        field === "destination" && finalDestinations.has(value as FinalReviewDestination)
          ? (value as FinalReviewDestination)
          : field === "destination"
            ? ""
            : snapshot.form.destination;
      publish({
        form: { ...snapshot.form, [field]: field === "destination" ? destination : value, verified: false },
        ...(snapshot.phase === "error" ? { phase: "idle", error: null } : {}),
      });
    },
    setVerified(verified) {
      if (inFlight || isLocked(snapshot.phase)) return;
      publish({
        form: { ...snapshot.form, verified },
        ...(snapshot.phase === "error" ? { phase: "idle", error: null } : {}),
      });
    },
    invalidateVerification() {
      if (inFlight || isLocked(snapshot.phase)) return;
      if (!snapshot.form.verified && snapshot.phase !== "error") return;
      publish({
        form: { ...snapshot.form, verified: false },
        ...(snapshot.phase === "error" ? { phase: "idle", error: null } : {}),
      });
    },
    requestRejection() {
      if (inFlight || isLocked(snapshot.phase)) return;
      publish({
        rejectionConfirmationOpen: true,
        ...(snapshot.phase === "error" ? { phase: "idle", error: null } : {}),
      });
    },
    cancelRejection() {
      if (inFlight || isLocked(snapshot.phase)) return;
      publish({
        rejectionConfirmationOpen: false,
        ...(snapshot.phase === "error" ? { phase: "idle", error: null } : {}),
      });
    },
    approve(document, draft) {
      if (!readyForSubmission()) return inFlight ?? Promise.resolve();
      let request: ReviewRequest;
      try {
        request = buildApprovalRequest(document, draft, snapshot.form);
      } catch (error) {
        setActionError(error);
        return Promise.resolve();
      }
      return sendRequest(document.documento_id, request);
    },
    confirmRejection(document) {
      if (!readyForSubmission()) return inFlight ?? Promise.resolve();
      if (!snapshot.rejectionConfirmationOpen) {
        setActionError("Confirma primero el paso de rechazo dentro de esta revisión");
        return Promise.resolve();
      }
      let request: ReviewRequest;
      try {
        request = buildRejectionRequest(document, snapshot.form);
      } catch (error) {
        setActionError(error);
        return Promise.resolve();
      }
      return sendRequest(document.documento_id, request);
    },
  };
}
