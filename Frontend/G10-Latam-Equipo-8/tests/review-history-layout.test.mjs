import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";

let renderer;
before(async () => {
  renderer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentReviewDialog.tsx", "ReviewEvents",
  );
});
after(async () => { await renderer?.close(); });
const render = (resource) => renderer.render({ resource });

test("review history has a parent container with the same mobile and desktop edge spacing as the upper review panels", () => {
  const html = render({ status: "loaded", value: [] });
  const parent = html.match(/^<div\b[^>]*class="([^"]*)"[^>]*>/)?.[1]?.split(" ") ?? [];
  assert.ok(parent.includes("px-4") && parent.includes("sm:px-6"),
    "recorded reviews need their own parent container with 16px/24px horizontal spacing");
  assert.ok(html.includes('<section aria-labelledby="review-events-heading"'),
    "the existing labeled history section must remain inside its spaced container");
});

test("history loading, errors, empty state and recorded event content remain available", () => {
  assert.ok(render({ status: "loading" }).includes("Cargando eventos de revisión…"));
  assert.ok(render({ status: "error", error: "Synthetic unavailable" }).includes("No se pudo cargar el historial de revisiones:"));
  assert.ok(render({ status: "loaded", value: [] }).includes("No hay eventos de revisión registrados para este documento."));
  const html = render({ status: "loaded", value: [{
    review_id: "SYNTHETIC-REVIEW",
    action: "aprobar",
    reviewer: "Synthetic reviewer",
    comment: "Synthetic review comment",
    created_at: "2026-01-01T00:00:00Z",
    previous_status: "NEEDS_AUDIT",
    new_status: "APPROVED",
    previous_destination: "AUDITORIA_HUMANA",
    new_destination: "NEFROLOGIA",
    corrections: [],
  }] });
  assert.ok(html.includes("Revisiones registradas") && html.includes("Revisor declarado: Synthetic reviewer"));
  assert.ok(html.includes("Synthetic review comment") && html.includes('dateTime="2026-01-01T00:00:00Z"'));
  assert.ok(html.includes("Sin correcciones registradas."));
});
