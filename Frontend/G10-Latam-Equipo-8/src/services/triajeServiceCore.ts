import type {
  DestinoPrincipal,
  DocumentoOriginal,
  HistoryResponse,
  ReviewEventResponse,
  ReviewRequest,
  StatusTriaje,
  TriajeDocumento,
} from "@/types/triaje";

export interface FiltrosHistorial {
  offset?: number;
  limit?: number;
  status?: StatusTriaje;
  destino?: DestinoPrincipal;
}

export interface ParametrosPaginacion {
  offset?: number;
  limit?: number;
}

export interface MockTriajeAdapter {
  getHistory: (filters: FiltrosHistorial) => Promise<HistoryResponse>;
  getAuditQueue: (page: ParametrosPaginacion) => Promise<HistoryResponse>;
  review: (documentId: string, request: ReviewRequest) => Promise<TriajeDocumento>;
  getDocument?: (documentId: string) => Promise<TriajeDocumento>;
  getOriginal?: (documentId: string) => Promise<DocumentoOriginal>;
  getReviewEvents?: (documentId: string) => Promise<ReviewEventResponse[]>;
}

export type TriajeServiceProvenance = "api" | "demo";

export interface TriajeServiceOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  mock?: MockTriajeAdapter;
}

/** HTTP error with its status and parsed response body preserved for callers. */
export class TriajeServiceError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
  readonly detail: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(mensajeError(body, status, statusText));
    this.name = "TriajeServiceError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.detail =
      body && typeof body === "object" && "detail" in body
        ? body.detail
        : undefined;
  }
}

function apiPrefix(apiBaseUrl: string): string {
  const base = apiBaseUrl.trim().replace(/\/+$/, "");
  if (!base) return "";
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

function queryString(filters: FiltrosHistorial): string {
  const params = new URLSearchParams();
  params.set("offset", String(filters.offset ?? 0));
  params.set("limit", String(filters.limit ?? 20));
  if (filters.status !== undefined) params.set("status", filters.status);
  if (filters.destino !== undefined) params.set("destino", filters.destino);
  return params.toString();
}

function mensajeError(body: unknown, status: number, statusText: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item &&
          typeof item.msg === "string"
            ? item.msg
            : "",
        )
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  }
  return `Error HTTP ${status}${statusText ? `: ${statusText}` : ""}`;
}

async function errorDesdeRespuesta(response: Response): Promise<TriajeServiceError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // A non-JSON error response still has a useful HTTP status fallback.
  }
  return new TriajeServiceError(response.status, response.statusText, body);
}

function nombreDesdeContentDisposition(value: string | null): string | undefined {
  if (!value) return undefined;

  const extended = /(?:^|;)\s*filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(value);
  if (extended) {
    const candidate = (extended[1] ?? extended[2] ?? "").trim();
    const encoded = /^UTF-8''(.+)$/i.exec(candidate);
    if (encoded) {
      try {
        return decodeURIComponent(encoded[1]);
      } catch {
        return undefined;
      }
    }
    if (candidate) return candidate;
  }

  const standard = /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(value);
  const filename = (standard?.[1] ?? standard?.[2] ?? "").trim();
  return filename || undefined;
}

export function createTriajeService(options: TriajeServiceOptions = {}) {
  const prefix = apiPrefix(options.apiBaseUrl ?? "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const mock = options.mock;

  async function requestJson<T>(
    path: string,
    init: RequestInit = { method: "GET" },
  ): Promise<T> {
    const response = await fetchImpl(`${prefix}${path}`, init);
    if (!response.ok) throw await errorDesdeRespuesta(response);
    return (await response.json()) as T;
  }

  async function requestOriginal(path: string): Promise<DocumentoOriginal> {
    const response = await fetchImpl(`${prefix}${path}`, { method: "GET" });
    if (!response.ok) throw await errorDesdeRespuesta(response);

    const contentType = response.headers.get("Content-Type");
    const filename = nombreDesdeContentDisposition(
      response.headers.get("Content-Disposition"),
    );
    return {
      blob: await response.blob(),
      contentType,
      ...(filename ? { filename } : {}),
    };
  }

  return {
    provenance: (prefix ? "api" : "demo") as TriajeServiceProvenance,

    getTriajes(filters: FiltrosHistorial = {}): Promise<HistoryResponse> {
      if (!prefix) {
        if (!mock) throw new Error("El servicio mock de triajes no está configurado");
        return mock.getHistory(filters);
      }
      return requestJson<HistoryResponse>(`/triajes?${queryString(filters)}`);
    },

    getAuditQueue(page: ParametrosPaginacion = {}): Promise<HistoryResponse> {
      if (!prefix) {
        if (!mock) throw new Error("El servicio mock de auditoría no está configurado");
        return mock.getAuditQueue(page);
      }
      const query = queryString(page);
      return requestJson<HistoryResponse>(`/audit/queue?${query}`);
    },

    getDetalleTriaje(documentId: string): Promise<TriajeDocumento> {
      if (!prefix) {
        if (!mock?.getDocument) {
          throw new Error("El detalle de triajes demo no está configurado");
        }
        return mock.getDocument(documentId);
      }
      return requestJson<TriajeDocumento>(
        `/triajes/${encodeURIComponent(documentId)}`,
      );
    },

    getDocumentoOriginal(documentId: string): Promise<DocumentoOriginal> {
      if (!prefix) {
        if (!mock?.getOriginal) {
          throw new Error("El original no está disponible en modo demo");
        }
        return mock.getOriginal(documentId);
      }
      return requestOriginal(
        `/triajes/${encodeURIComponent(documentId)}/documento`,
      );
    },

    getRevisiones(documentId: string): Promise<ReviewEventResponse[]> {
      if (!prefix) {
        if (!mock?.getReviewEvents) {
          throw new Error("El historial de revisiones demo no está configurado");
        }
        return mock.getReviewEvents(documentId);
      }
      return requestJson<ReviewEventResponse[]>(
        `/triajes/${encodeURIComponent(documentId)}/revisiones`,
      );
    },

    subirArchivo(
      documentId: string,
      canalOrigen: string,
      archivo: File,
    ): Promise<TriajeDocumento> {
      if (!prefix) {
        throw new Error("La carga de archivos requiere el backend configurado en VITE_API_URL");
      }
      const formData = new FormData();
      formData.append("documento_id", documentId);
      formData.append("canal_origen", canalOrigen);
      formData.append("archivo", archivo);
      return requestJson<TriajeDocumento>("/triajes/archivo", {
        method: "POST",
        body: formData,
      });
    },

    revisarDocumento(
      documentId: string,
      request: ReviewRequest,
    ): Promise<TriajeDocumento> {
      if (!prefix) {
        if (!mock) throw new Error("El servicio mock de revisión no está configurado");
        return mock.review(documentId, request);
      }
      return requestJson<TriajeDocumento>(
        `/triajes/${encodeURIComponent(documentId)}/revision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        },
      );
    },
  };
}
