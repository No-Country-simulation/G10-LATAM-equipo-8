import type {
  DestinoPrincipal,
  HistoryResponse,
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
}

export interface TriajeServiceOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  mock?: MockTriajeAdapter;
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

async function mensajeError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
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
  } catch {
    // A non-JSON error response still has a useful HTTP status fallback below.
  }
  return `Error HTTP ${response.status}${response.statusText ? `: ${response.statusText}` : ""}`;
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
    if (!response.ok) throw new Error(await mensajeError(response));
    return (await response.json()) as T;
  }

  return {
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
