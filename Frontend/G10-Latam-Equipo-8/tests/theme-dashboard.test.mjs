import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

test("document collections use themed text and surfaces", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentCollectionView.tsx", "DocumentCollectionView",
  );
  try {
    const markup = renderer.render({
      kind: "pending",
      page: { items: [syntheticDocument()], total: 1, offset: 0, limit: 20 },
      hasPage: true,
      isLoading: false,
      error: null,
      search: "",
      documentType: "",
      reviewStatusFilter: "",
      onSearchChange() {}, onDocumentTypeChange() {}, onReviewStatusChange() {},
      async onPageChange() {}, async onRetry() {}, onOpenDocument() {},
    });
    const heading = markup.match(/<h2\b[^>]*id="document-collection-title"[^>]*>/)?.[0];
    assert.ok(heading);
    assert.match(heading, /\btext-foreground\b/);
    assert.match(markup, /\bbg-card\b/);
    assert.match(markup, /Pendientes/);
  } finally {
    await renderer.close();
  }
});

test("document upload keeps its heading readable in either theme", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentUpload.tsx", "DocumentUpload",
  );
  try {
    const markup = renderer.render({ uploadState: { phase: "idle" }, onFileSelected() {} });
    const heading = markup.match(/<h2\b[^>]*id="upload-title"[^>]*>/)?.[0];
    assert.ok(heading);
    assert.match(heading, /\btext-foreground\b/);
    assert.match(markup, /Seleccionar archivo/);
  } finally {
    await renderer.close();
  }
});

test("upload errors retain visible text on themed surfaces", async () => {
  const renderer = await createDashboardRenderer(
    "/src/components/dashboard/UploadStatus.tsx", "UploadStatus",
  );
  try {
    const markup = renderer.render({
      uploadState: {
        phase: "failed", fileName: "sintetico.pdf", error: "Error sintético",
        collectionRefreshError: null, confirmedResults: [], confirmedDocument: null,
      },
    });
    assert.match(markup, /\bbg-card\b/);
    assert.match(markup, /dark:text-red-300/);
    assert.match(markup, /role="alert"/);
    assert.match(markup, /Error sintético/);
  } finally {
    await renderer.close();
  }
});
