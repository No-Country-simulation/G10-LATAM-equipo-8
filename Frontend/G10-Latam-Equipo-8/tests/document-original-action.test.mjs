import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";
import { createOriginalPreviewLease } from "../src/hooks/useDocumentReview.ts";

let viewer;
let download;
before(async () => {
  viewer = await createDashboardRenderer(
    "/src/components/dashboard/DocumentOriginalViewer.tsx", "DocumentOriginalViewer",
  );
  download = await createDashboardRenderer(
    "/src/components/dashboard/DocumentOriginalViewer.tsx", "OriginalDocumentDownload",
  );
});
after(async () => { await Promise.all([viewer?.close(), download?.close()]); });

function render(resource) {
  return viewer.render({ documentId: "ORIGINAL-SYNTHETIC", provenance: "api", resource });
}

test("a received original has a visible download control below the preview, inert until its validated lease is ready", () => {
  const html = render({
    status: "loaded",
    value: {
      blob: new Blob(["synthetic test only"], { type: "application/pdf" }),
      contentType: "application/pdf",
      filename: "fictitious-original.pdf",
    },
  });
  assert.ok(html.includes("Descargar original"), "the original viewer needs a visible download action");
  assert.ok(html.indexOf("Descargar original") > html.indexOf("No se ofrece vista previa"),
    "the action must follow the preview, not displace its header");
  const control = html.match(/<button\b[^>]*>Descargar original<\/button>/)?.[0];
  assert.ok(control && /\sdisabled(?:=|\s|>)/.test(control),
    "SSR does not run the preview effect: no active lease means a genuinely disabled control");
  assert.ok(!html.includes("href="), "an inactive preview must not expose any download URL");
});

test("the native action reuses each supported MIME lease and the response filename without another target or transport", () => {
  for (const contentType of ["application/pdf", "image/png", "image/jpeg"]) {
    const filename = "fictitious-original";
    const lease = createOriginalPreviewLease({
      blob: new Blob(["synthetic test only"], { type: contentType }),
      contentType,
      filename,
    });
    try {
      assert.ok(lease.kind && lease.url, "the existing MIME gate must supply the active URL");
      const html = download.render({ url: lease.url, filename });
      assert.ok(html.startsWith("<a "));
      assert.ok(html.includes(`href="${lease.url}"`) && html.includes(`download="${filename}"`),
        "download must consume the unchanged validated URL and filename");
      assert.ok(!html.includes("target=") && !html.includes("disabled"),
        "a ready native download needs no popup or custom click handler");
    } finally {
      lease.dispose();
    }
  }
});

test("loading and unavailable originals retain their previous messages and expose no download URL", () => {
  const loading = render({ status: "loading" });
  assert.ok(loading.includes("Cargando bytes del original…"));
  assert.ok(loading.includes("Esperando la respuesta del original."));
  assert.ok(!loading.includes("Descargar original") && !loading.includes("href="));
  const failed = render({ status: "error", error: "Synthetic unavailable response" });
  assert.ok(failed.includes("No se pudo cargar el documento original."));
  assert.ok(failed.includes("Los datos del documento se cargan y muestran por separado."));
  assert.ok(!failed.includes("Descargar original") && !failed.includes("href="));
});
