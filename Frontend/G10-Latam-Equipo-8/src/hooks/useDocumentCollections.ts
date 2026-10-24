import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { triajeService } from "../services/triajeService";
import { createDocumentCollectionsController } from "./documentCollectionsController";
import { startDocumentCollectionsPolling } from "./documentCollectionsPolling";

export function useDocumentCollections() {
  const [controller] = useState(() =>
    createDocumentCollectionsController(triajeService),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const refreshCollections = useCallback(
    () => controller.refreshCollections(),
    [controller],
  );

  useEffect(() => {
    let active = true;
    let stopPolling: (() => void) | null = null;
    const startPolling = () => {
      if (!active) return;
      stopPolling = startDocumentCollectionsPolling(() =>
        controller.refreshCollections({ background: true }),
      );
    };

    void controller.loadInitial().then(startPolling, startPolling);
    return () => {
      active = false;
      stopPolling?.();
    };
  }, [controller]);

  return {
    ...snapshot,
    closeDocument: controller.closeDocument,
    loadAuditPage: controller.loadAuditPage,
    loadHistoryPage: controller.loadHistoryPage,
    openDocument: controller.openDocument,
    refreshCollections,
    retryAuditQueue: controller.retryAuditQueue,
    retryHistory: controller.retryHistory,
    setDocumentType: controller.setDocumentType,
    setReviewStatus: controller.setReviewStatus,
    setSearch: controller.setSearch,
  };
}
