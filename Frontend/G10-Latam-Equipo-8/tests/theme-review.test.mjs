import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";
import { createReviewDraft } from "../src/components/dashboard/reviewDraft.ts";

test("the original viewer uses themed text and preview surfaces", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentOriginalViewer.tsx", "DocumentOriginalViewer",
  );
  try {
    const markup = renderer.render({
      documentId: "ORIGINAL-SYNTHETIC", provenance: "api", resource: { status: "loading" },
    });
    assert.match(markup, /text-foreground/);
    assert.match(markup, /bg-background/);
    assert.match(markup, /Cargando bytes del original/);
  } finally {
    await renderer.close();
  }
});

test("reviewed document fields use readable themed headings", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/ReviewDocumentFields.tsx", "ReviewDocumentFields",
  );
  try {
    const document = syntheticDocument({ status: "APPROVED" });
    const markup = renderer.render({
      document, draft: createReviewDraft(document),
      onDraftChange() {}, onAgeClear() {}, onEnableEditing() {},
    });
    assert.match(markup, /text-foreground[^>]*>Datos extraídos/);
    assert.match(markup, /Aprobado/);
  } finally {
    await renderer.close();
  }
});

test("review errors and conflicts remain legible and announced in dark mode", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/ReviewDecisionFields.tsx", "ReviewDecisionFields",
  );
  try {
    const base = {
      busy: false, canApprove: false, canReject: false, hasEffectiveCorrections: false,
      onFieldChange() {}, onVerificationChange() {}, onRequestRejection() {},
      onCancelRejection() {}, onConfirmRejection() {}, onApprove() {},
    };
    for (const [phase, background, foreground] of [
      ["error", "dark:bg-red-950", "dark:text-red-200"],
      ["conflict", "dark:bg-amber-950", "dark:text-amber-200"],
    ]) {
      const markup = renderer.render({
        ...base,
        snapshot: {
          phase, error: "Error sintético", latestDocument: null,
          form: { reviewer: "", comment: "", destination: "", verified: false },
          rejectionConfirmationOpen: false,
        },
      });
      assert.match(markup, /role="alert"/);
      assert.ok(markup.includes(background), background);
      assert.ok(markup.includes(foreground), foreground);
      assert.match(markup, /Error sintético/);
    }
  } finally {
    await renderer.close();
  }
});
