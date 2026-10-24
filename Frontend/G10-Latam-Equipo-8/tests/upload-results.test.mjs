import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createDashboardRenderer } from "./helpers/dashboard-renderer.mjs";

let renderer;
before(async () => {
  renderer = await createDashboardRenderer(
    "src/components/dashboard/UploadStatus.tsx",
    "UploadStatus",
  );
});
after(async () => {
  await renderer?.close();
});

function documento(documento_id, overrides = {}) {
  return {
    documento_id,
    status: "NEEDS_AUDIT",
    processing_status: "SUCCEEDED",
    processing_error: null,
    clasificacion: { nivel_prioridad: "Rutina" },
    ...overrides,
  };
}

function uploadState(documents, phase = "confirmed") {
  const latest = documents[0] ?? null;
  return {
    phase,
    fileName: latest?.fileName ?? "nuevo.pdf",
    confirmedFileName: latest?.fileName ?? null,
    error: null,
    collectionRefreshError: null,
    confirmedDocument: latest?.document ?? null,
    confirmedResults: documents,
  };
}

test("upload navigation renders every confirmed result newest-first", () => {
  const markup = renderer.render({
    uploadState: uploadState([
      { document: documento("DOCUMENT-NEW"), fileName: "nuevo.pdf" },
      { document: documento("DOCUMENT-OLD"), fileName: "anterior.pdf" },
    ]),
    resultPresentation: "history",
  });

  const newest = markup.indexOf("DOCUMENT-NEW");
  const older = markup.indexOf("DOCUMENT-OLD");
  assert.equal(newest >= 0, true);
  assert.equal(older >= 0, true);
  assert.equal(newest < older, true);
  assert.equal(markup.includes("anterior.pdf"), true);
});

test("other destinations expose only the latest confirmed result behind a compact control", () => {
  const markup = renderer.render({
    uploadState: uploadState([
      { document: documento("DOCUMENT-NEW"), fileName: "nuevo.pdf" },
      { document: documento("DOCUMENT-OLD"), fileName: "anterior.pdf" },
    ]),
    resultPresentation: "latest",
  });

  assert.equal(markup.includes("<details"), true);
  assert.equal(markup.includes("<summary"), true);
  assert.equal(markup.includes("DOCUMENT-NEW"), true);
  assert.equal(markup.includes("DOCUMENT-OLD"), false);
});

test("existing upload status and result details remain visible by default", () => {
  const failedResult = documento("DOCUMENT-FAILED", {
    processing_status: "FAILED",
    processing_error: "GEMINI_TIMEOUT",
  });
  const markup = renderer.render({
    uploadState: {
      phase: "confirmed",
      fileName: "fallo.pdf",
      confirmedFileName: "fallo.pdf",
      error: null,
      collectionRefreshError: null,
      confirmedDocument: failedResult,
    },
    onOpenConfirmedDocument: () => {},
  });

  assert.equal(markup.includes("Resultado confirmado"), true);
  assert.equal(markup.includes("DOCUMENT-FAILED"), true);
  assert.equal(markup.includes("no es una extracción exitosa"), true);
  assert.equal(markup.includes("GEMINI_TIMEOUT"), true);
  assert.equal(markup.includes("Abrir resultado"), true);
});

test("busy and refresh-error awareness remains separate from upload history", () => {
  const state = uploadState([
    { document: documento("DOCUMENT-NEW"), fileName: "nuevo.pdf" },
    { document: documento("DOCUMENT-OLD"), fileName: "anterior.pdf" },
  ], "uploading");
  state.fileName = "en-curso.pdf";
  state.collectionRefreshError = "No se pudo actualizar la lista";
  const markup = renderer.render({
    uploadState: state,
    resultPresentation: "history",
  });

  const status = markup.indexOf("Cargando…");
  const newest = markup.indexOf("DOCUMENT-NEW");
  const older = markup.indexOf("DOCUMENT-OLD");
  assert.equal(markup.includes("role=\"status\""), true);
  assert.equal(markup.includes("role=\"alert\""), true);
  assert.equal(markup.includes("No se pudo actualizar la lista"), true);
  assert.equal(status >= 0 && status < newest, true);
  assert.equal(newest >= 0 && newest < older, true);
});
