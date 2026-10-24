import type {
  HistoryResponse,
  StatusTriaje,
  TriajeDocumento,
} from "../types/triaje";

export interface DocumentCollectionsService {
  getTriajes: (filters: {
    offset: number;
    limit: number;
    status?: StatusTriaje;
  }) => Promise<HistoryResponse>;
  getAuditQueue: (page: { offset: number; limit: number }) => Promise<HistoryResponse>;
}

export interface DocumentCollectionsRefreshOptions {
  background?: boolean;
}

export interface DocumentCollectionsSnapshot {
  history: HistoryResponse;
  auditQueue: HistoryResponse;
  historyState: "idle" | "loading" | "loaded" | "error";
  auditQueueState: "idle" | "loading" | "loaded" | "error";
  historyError: string | null;
  auditQueueError: string | null;
  hasHistory: boolean;
  hasAuditQueue: boolean;
  allDocumentsTotal?: number | null;
  historyRequestOffset: number;
  auditRequestOffset: number;
  reviewStatusFilter: StatusTriaje | "";
  search: string;
  documentType: string;
  selectedDocument: TriajeDocumento | null;
}

export interface DocumentCollectionsController {
  getSnapshot: () => DocumentCollectionsSnapshot;
  subscribe: (listener: () => void) => () => void;
  loadInitial: () => Promise<void>;
  loadHistoryPage: (offset: number) => Promise<void>;
  loadAuditPage: (offset: number) => Promise<void>;
  setSearch: (search: string) => void;
  setDocumentType: (documentType: string) => void;
  setReviewStatus: (status: StatusTriaje | "") => Promise<void>;
  retryHistory: () => Promise<void>;
  retryAuditQueue: () => Promise<void>;
  refreshCollections: (options?: DocumentCollectionsRefreshOptions) => Promise<void>;
  openDocument: (document: TriajeDocumento) => void;
  closeDocument: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

function emptyPage(limit = DEFAULT_PAGE_SIZE): HistoryResponse {
  return { items: [], total: 0, offset: 0, limit };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

function normalizedOffset(offset: number): number {
  return Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
}

export function createDocumentCollectionsController(
  service: DocumentCollectionsService,
  pageSize = DEFAULT_PAGE_SIZE,
): DocumentCollectionsController {
  const initialPage = emptyPage(pageSize);
  let snapshot: DocumentCollectionsSnapshot = {
    history: initialPage,
    auditQueue: initialPage,
    historyState: "idle",
    auditQueueState: "idle",
    historyError: null,
    auditQueueError: null,
    hasHistory: false,
    hasAuditQueue: false,
    allDocumentsTotal: null,
    historyRequestOffset: 0,
    auditRequestOffset: 0,
    reviewStatusFilter: "",
    search: "",
    documentType: "",
    selectedDocument: null,
  };
  let historyRequestId = 0;
  let auditRequestId = 0;
  let allDocumentsTotalRequestId = 0;
  let initialLoadPromise: Promise<void> | null = null;
  let foregroundRefreshCount = 0;
  let backgroundRefreshPromise: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function publish(update: Partial<DocumentCollectionsSnapshot>) {
    snapshot = { ...snapshot, ...update };
    for (const listener of [...listeners]) listener();
  }

  async function requestAllDocumentsTotal(): Promise<void> {
    const requestId = ++allDocumentsTotalRequestId;
    try {
      const response = await service.getTriajes({ offset: 0, limit: pageSize });
      if (requestId !== allDocumentsTotalRequestId) return;
      publish({ allDocumentsTotal: response.total });
    } catch {
      // Keep the last confirmed total, or null when no unfiltered total is known yet.
    }
  }

  async function requestHistory(
    offset: number,
    status: StatusTriaje | "",
    requestId: number,
    background = false,
  ): Promise<string | null> {
    const totalRequestId = status ? null : ++allDocumentsTotalRequestId;
    try {
      const page = await service.getTriajes({
        offset,
        limit: pageSize,
        ...(status ? { status } : {}),
      });
      if (requestId !== historyRequestId) return null;
      publish({
        history: page,
        historyState: "loaded",
        historyError: null,
        hasHistory: true,
        ...(totalRequestId !== null && totalRequestId === allDocumentsTotalRequestId
          ? { allDocumentsTotal: page.total }
          : {}),
      });
      return null;
    } catch (error) {
      const message = messageOf(error);
      if (requestId === historyRequestId) {
        publish({
          historyState: background && snapshot.hasHistory ? "loaded" : "error",
          historyError: message,
        });
      }
      return background && requestId !== historyRequestId ? null : message;
    }
  }

  async function requestAuditQueue(
    offset: number,
    requestId: number,
    background = false,
  ): Promise<string | null> {
    try {
      const page = await service.getAuditQueue({ offset, limit: pageSize });
      if (requestId !== auditRequestId) return null;
      publish({
        auditQueue: page,
        auditQueueState: "loaded",
        auditQueueError: null,
        hasAuditQueue: true,
      });
      return null;
    } catch (error) {
      const message = messageOf(error);
      if (requestId === auditRequestId) {
        publish({
          auditQueueState: background && snapshot.hasAuditQueue ? "loaded" : "error",
          auditQueueError: message,
        });
      }
      return background && requestId !== auditRequestId ? null : message;
    }
  }

  function loadInitial(): Promise<void> {
    if (initialLoadPromise) return initialLoadPromise;

    const historyId = ++historyRequestId;
    const auditId = ++auditRequestId;
    publish({
      historyState: "loading",
      historyError: null,
      auditQueueState: "loading",
      auditQueueError: null,
    });
    initialLoadPromise = Promise.all([
      requestHistory(snapshot.historyRequestOffset, snapshot.reviewStatusFilter, historyId),
      requestAuditQueue(snapshot.auditRequestOffset, auditId),
      ...(snapshot.reviewStatusFilter ? [requestAllDocumentsTotal()] : []),
    ]).then(() => undefined);
    return initialLoadPromise;
  }

  async function loadHistoryPage(offset: number): Promise<void> {
    const requestOffset = normalizedOffset(offset);
    const requestId = ++historyRequestId;
    publish({
      historyRequestOffset: requestOffset,
      historyState: "loading",
      historyError: null,
    });
    await requestHistory(requestOffset, snapshot.reviewStatusFilter, requestId);
  }

  async function loadAuditPage(offset: number): Promise<void> {
    const requestOffset = normalizedOffset(offset);
    const requestId = ++auditRequestId;
    publish({
      auditRequestOffset: requestOffset,
      auditQueueState: "loading",
      auditQueueError: null,
    });
    await requestAuditQueue(requestOffset, requestId);
  }

  async function setReviewStatus(status: StatusTriaje | ""): Promise<void> {
    publish({ reviewStatusFilter: status, hasHistory: false });
    await Promise.all([
      loadHistoryPage(0),
      ...(status ? [requestAllDocumentsTotal()] : []),
    ]);
  }

  async function performCollectionRefresh(background: boolean): Promise<void> {
    const historyId = ++historyRequestId;
    const auditId = ++auditRequestId;
    const historyOffset = snapshot.historyRequestOffset;
    const auditOffset = snapshot.auditRequestOffset;
    const status = snapshot.reviewStatusFilter;
    if (!background) {
      publish({
        historyState: "loading",
        historyError: null,
        auditQueueState: "loading",
        auditQueueError: null,
      });
    }

    const [historyError, auditError] = await Promise.all([
      requestHistory(historyOffset, status, historyId, background),
      requestAuditQueue(auditOffset, auditId, background),
      ...(status ? [requestAllDocumentsTotal()] : []),
    ]);
    const errors = [
      historyError ? `No se pudo actualizar el historial: ${historyError}` : null,
      auditError ? `No se pudo actualizar la cola de auditoría: ${auditError}` : null,
    ].filter((message): message is string => message !== null);
    if (errors.length > 0) throw new Error(errors.join("; "));
  }

  async function refreshCollections(
    options: DocumentCollectionsRefreshOptions = {},
  ): Promise<void> {
    const background = options.background === true;
    if (background) {
      if (
        foregroundRefreshCount > 0 ||
        snapshot.historyState === "loading" ||
        snapshot.auditQueueState === "loading"
      ) {
        return;
      }
      if (backgroundRefreshPromise) return backgroundRefreshPromise;
      const pendingRefresh = performCollectionRefresh(true);
      backgroundRefreshPromise = pendingRefresh;
      try {
        await pendingRefresh;
      } finally {
        if (backgroundRefreshPromise === pendingRefresh) {
          backgroundRefreshPromise = null;
        }
      }
      return;
    }

    foregroundRefreshCount += 1;
    try {
      await performCollectionRefresh(false);
    } finally {
      foregroundRefreshCount -= 1;
    }
  }

  function retryHistory(): Promise<void> {
    return loadHistoryPage(snapshot.historyRequestOffset);
  }

  function retryAuditQueue(): Promise<void> {
    return loadAuditPage(snapshot.auditRequestOffset);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadInitial,
    loadHistoryPage,
    loadAuditPage,
    setSearch(search) {
      publish({ search });
    },
    setDocumentType(documentType) {
      publish({ documentType });
    },
    setReviewStatus,
    retryHistory,
    retryAuditQueue,
    refreshCollections,
    openDocument(document) {
      publish({ selectedDocument: document });
    },
    closeDocument() {
      publish({ selectedDocument: null });
    },
  };
}

function normalizeDocumentSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function isImmediateAlert(document: TriajeDocumento): boolean {
  return document.status !== "APPROVED" && document.decision_enrutamiento.alerta_urgente === true;
}

export function filterCollectionDocuments(
  documents: TriajeDocumento[],
  filters: { search: string; documentType: string },
  urgentOnly = false,
): TriajeDocumento[] {
  const query = normalizeDocumentSearch(filters.search.trim());
  return documents.filter((document) => {
    if (urgentOnly && !isImmediateAlert(document)) {
      return false;
    }
    if (
      filters.documentType &&
      document.clasificacion.tipo_documento !== filters.documentType
    ) {
      return false;
    }
    if (!query) return true;
    const patientName = document.datos_extraidos.paciente.nombre ?? "";
    return [document.documento_id, patientName].some((value) =>
      normalizeDocumentSearch(value).includes(query),
    );
  });
}

export function countUrgentAlerts(documents: TriajeDocumento[]): number {
  return documents.filter(isImmediateAlert).length;
}
