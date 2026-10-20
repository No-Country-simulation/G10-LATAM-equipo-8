import { useEffect, useState, useSyncExternalStore } from "react";
import { triajeService } from "../services/triajeService";
import { createDocumentCollectionsController } from "./documentCollectionsController";

export function useDocumentCollections() {
  const [controller] = useState(() =>
    createDocumentCollectionsController(triajeService),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    void controller.loadInitial();
  }, [controller]);

  return {
    ...snapshot,
    closeDocument: controller.closeDocument,
    loadAuditPage: controller.loadAuditPage,
    loadHistoryPage: controller.loadHistoryPage,
    openDocument: controller.openDocument,
    refreshCollections: controller.refreshCollections,
    retryAuditQueue: controller.retryAuditQueue,
    retryHistory: controller.retryHistory,
    setDocumentType: controller.setDocumentType,
    setReviewStatus: controller.setReviewStatus,
    setSearch: controller.setSearch,
  };
}
