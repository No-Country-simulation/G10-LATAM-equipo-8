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
