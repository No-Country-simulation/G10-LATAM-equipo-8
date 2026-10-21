import type { HistoryResponse } from "@/types/triaje";
import frontendReviewHistory from "../../../../docs/examples/frontend-review/historial.json" with {
  type: "json",
};

/** The portable synthetic sample is the single source for the demo review cases. */
export const frontendReviewDataset = frontendReviewHistory as HistoryResponse;

export const frontendReviewDocumentIds = new Set(
  frontendReviewDataset.items.map(({ documento_id }) => documento_id),
);
