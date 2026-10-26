import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

let renderer;
before(async () => {
  renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentCollectionView.tsx", "DocumentCollectionView",
  );
});
after(async () => { await renderer?.close(); });

function render(kind, hasPage = true) {
  return renderer.render({
    kind,
    page: {
      items: [syntheticDocument({ decision_enrutamiento: { alerta_urgente: true } })],
      total: 41, offset: 20, limit: 20,
    },
    hasPage,
    isLoading: false,
    error: null,
    search: "",
    documentType: "",
    reviewStatusFilter: "",
    onSearchChange() {},
    onDocumentTypeChange() {},
    onReviewStatusChange() {},
    async onPageChange() {},
    async onRetry() {},
    onOpenDocument() {},
  });
}

function introduction(html) {
  return html.match(/<h2[^>]*id="document-collection-title"[^>]*>.*?<\/h2><p[^>]*>(.*?)<\/p>/)?.[1];
}

test("alerts introduce immediate attention in plain language whether or not a page is loaded", () => {
  for (const hasPage of [true, false]) {
    assert.equal(introduction(render("alerts", hasPage)),
      "Esta página reúne las alertas que necesitan atención inmediata.");
  }
});

test("other introductions and the explicit loaded-page alert count retain their previous meaning", () => {
  assert.equal(introduction(render("all")), "Historial completo · 41 documentos");
  assert.equal(introduction(render("pending")),
    "La cantidad pendiente corresponde a auditoría humana y no representa alertas de urgencia clínica. · 41 pendientes de auditoría");
  assert.ok(render("alerts").includes("Alertas inmediatas en esta página: 1"),
    "the simple introduction must not relabel the local alert count as a global count");
});
