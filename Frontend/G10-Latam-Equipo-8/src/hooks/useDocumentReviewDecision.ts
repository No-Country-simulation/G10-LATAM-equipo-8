import { useMemo, useSyncExternalStore } from "react";
import { triajeService } from "../services/triajeService";
import {
  createDocumentReviewDecisionController,
  type DocumentReviewDecisionCallbacks,
} from "./documentReviewDecisionController";

export function useDocumentReviewDecision(
  callbacks: DocumentReviewDecisionCallbacks,
) {
  const {
    refreshCollections,
    onDecisionConfirmed,
    onCollectionRefreshError,
  } = callbacks;
  const controller = useMemo(
    () =>
      createDocumentReviewDecisionController(triajeService, {
        refreshCollections,
        onDecisionConfirmed,
        onCollectionRefreshError,
      }),
    [
      refreshCollections,
      onDecisionConfirmed,
      onCollectionRefreshError,
    ],
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return {
    snapshot,
    approve: controller.approve,
    cancelRejection: controller.cancelRejection,
    confirmRejection: controller.confirmRejection,
    invalidateVerification: controller.invalidateVerification,
    requestRejection: controller.requestRejection,
    setField: controller.setField,
    setVerified: controller.setVerified,
  };
}
