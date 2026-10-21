import type { EstadoProcesamiento, TriajeDocumento } from "@/types/triaje";

export type DocumentUploadPhase = "idle" | "uploading" | "failed" | "confirmed";

export interface DocumentUploadSnapshot {
  phase: DocumentUploadPhase;
  fileName: string | null;
  confirmedFileName: string | null;
  error: string | null;
  collectionRefreshError: string | null;
  confirmedDocument: TriajeDocumento | null;
}

export interface DocumentUploadControllerOptions {
  uploadFile: (file: File) => Promise<TriajeDocumento>;
  onConfirmed?: (document: TriajeDocumento) => void | Promise<void>;
}

export interface DocumentUploadController {
  getSnapshot: () => DocumentUploadSnapshot;
  subscribe: (listener: () => void) => () => void;
  upload: (file: File) => Promise<TriajeDocumento | null>;
}

const supportedMimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const initialSnapshot: DocumentUploadSnapshot = {
  phase: "idle",
  fileName: null,
  confirmedFileName: null,
  error: null,
  collectionRefreshError: null,
  confirmedDocument: null,
};

export function validateSupportedUploadFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const expectedMime = supportedMimeByExtension[extension];
  if (!expectedMime) {
    return "Formato no compatible. Selecciona un archivo PDF, PNG, JPG o JPEG.";
  }
  if (file.type && file.type.toLowerCase() !== expectedMime) {
    return "El tipo de archivo no coincide con su extensión. Selecciona un PDF, PNG, JPG o JPEG válido.";
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo cargar el documento";
}

export function estadoProcesamientoLegible(status: EstadoProcesamiento): string {
  const labels: Record<EstadoProcesamiento, string> = {
    PENDING: "Pendiente",
    PROCESSING: "En procesamiento",
    SUCCEEDED: "Procesamiento finalizado",
    FAILED: "Procesamiento fallido",
  };
  return labels[status];
}

export function estadoRevisionLegible(status: TriajeDocumento["status"]): string {
  const labels: Record<TriajeDocumento["status"], string> = {
    PROCESSED: "Procesado",
    NEEDS_AUDIT: "Revisión pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
  };
  return labels[status];
}

export function prioridadClinicaLegible(
  priority: TriajeDocumento["clasificacion"]["nivel_prioridad"],
): string {
  if (priority === null) return "Sin evaluar";
  return priority === "Rutina" ? "Rutinaria" : "Urgente";
}

export function createDocumentUploadController(
  options: DocumentUploadControllerOptions,
): DocumentUploadController {
  let snapshot = initialSnapshot;
  let busy = false;
  let inFlight: Promise<TriajeDocumento | null> | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: DocumentUploadSnapshot) => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  const getSnapshot = () => snapshot;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const upload = (file: File): Promise<TriajeDocumento | null> => {
    if (busy) return inFlight ?? Promise.resolve(null);

    const validationError = validateSupportedUploadFile(file);
    if (validationError) {
      publish({
        ...snapshot,
        phase: "failed",
        fileName: file.name,
        error: validationError,
        collectionRefreshError: null,
      });
      return Promise.resolve(null);
    }

    busy = true;
    publish({
      ...snapshot,
      phase: "uploading",
      fileName: file.name,
      error: null,
      collectionRefreshError: null,
    });

    const operation = Promise.resolve().then(async () => {
      let document: TriajeDocumento;
      try {
        document = await options.uploadFile(file);
      } catch (error) {
        publish({
          ...snapshot,
          phase: "failed",
          error: errorMessage(error),
          collectionRefreshError: null,
        });
        return null;
      }

      publish({
        ...snapshot,
        phase: "confirmed",
        confirmedFileName: snapshot.fileName,
        error: null,
        collectionRefreshError: null,
        confirmedDocument: document,
      });

      try {
        await options.onConfirmed?.(document);
      } catch (error) {
        publish({
          ...snapshot,
          collectionRefreshError: errorMessage(error),
        });
      }
      return document;
    });

    inFlight = operation.finally(() => {
      busy = false;
      inFlight = null;
    });
    return inFlight;
  };

  return { getSnapshot, subscribe, upload };
}
