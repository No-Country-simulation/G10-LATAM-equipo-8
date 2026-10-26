import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import {
  auditReasonLabel,
  processingStatusLabel,
  reviewStatusLabel,
  statusTransitionLabel,
} from "../src/lib/documentLabels.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

test("pure label helpers translate known codes and preserve unknown values", () => {
  for (const [status, label] of [
    ["PROCESSED", "Procesado"],
    ["NEEDS_AUDIT", "Necesita Auditoria"],
    ["APPROVED", "Aprobado"],
    ["REJECTED", "Rechazado"],
  ]) {
    assert.equal(reviewStatusLabel(status), label);
  }
  for (const [status, label] of [
    ["PENDING", "Pendiente"],
    ["PROCESSING", "En procesamiento"],
    ["SUCCEEDED", "Procesamiento finalizado"],
    ["FAILED", "Procesamiento fallido"],
  ]) {
    assert.equal(processingStatusLabel(status), label);
  }

  assert.equal(
    statusTransitionLabel("NEEDS_AUDIT", "APPROVED"),
    "Necesita Auditoria -> Aprobado",
  );
  assert.equal(
    auditReasonLabel("UNVERIFIED_BINARY_EVIDENCE"),
    "Evidencia del archivo sin verificar",
  );
  assert.equal(
    auditReasonLabel("GEMINI_REQUIRES_HUMAN_REVIEW"),
    "Gemini requiere revisión humana",
  );
  assert.equal(reviewStatusLabel("FUTURE_STATUS"), "FUTURE_STATUS");
  assert.equal(processingStatusLabel("FUTURE_PROCESSING"), "FUTURE_PROCESSING");
  assert.equal(auditReasonLabel("FUTURE_REVIEW_REASON"), "FUTURE_REVIEW_REASON");
  assert.equal(
    auditReasonLabel("Requiere confirmación del equipo"),
    "Requiere confirmación del equipo",
  );
});

test("collection presents known and unknown audit reasons without changing contract values", async (t) => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentCollectionView.tsx",
    "DocumentCollectionView",
  );
  t.after(renderer.close);

  const document = syntheticDocument({
    audit_reasons: [
      "UNVERIFIED_BINARY_EVIDENCE",
      "GEMINI_REQUIRES_HUMAN_REVIEW",
      "FUTURE_REVIEW_REASON",
      "Requiere confirmación del equipo",
    ],
  });
  const original = JSON.stringify(document);
  const html = renderer.render({
    kind: "all",
    page: { items: [document], total: 1, limit: 20, offset: 0 },
    hasPage: true,
    isLoading: false,
    error: null,
    search: "",
    documentType: "",
    reviewStatusFilter: "",
    onSearchChange: () => {},
    onDocumentTypeChange: () => {},
    onReviewStatusChange: () => {},
    onPageChange: async () => {},
    onRetry: async () => {},
    onOpenDocument: () => {},
  });

  assert.equal(html.includes("Estado: Necesita Auditoria"), true);
  assert.equal(html.includes("Evidencia del archivo sin verificar"), true);
  assert.equal(html.includes("Gemini requiere revisión humana"), true);
  assert.equal(html.includes("FUTURE_REVIEW_REASON"), true);
  assert.equal(html.includes("Requiere confirmación del equipo"), true);
  assert.equal(html.includes('value="NEEDS_AUDIT"'), true);
  assert.equal(JSON.stringify(document), original);
});
