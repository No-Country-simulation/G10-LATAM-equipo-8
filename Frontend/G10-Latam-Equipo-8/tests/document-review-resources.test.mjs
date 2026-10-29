import assert from "node:assert/strict";
import test from "node:test";
import {
  createOriginalPreviewLease,
  getOriginalPreviewKind,
  startDocumentReviewLoad,
} from "../src/hooks/useDocumentReview.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

test("detail, original and review events load independently with isolated errors", async () => {
  const detail = syntheticDocument();
  const events = [];
  const requests = [];
  const updates = [];
  const cancel = startDocumentReviewLoad(
    detail.documento_id,
    {
      getDetalleTriaje: (id) => {
        requests.push(["detail", id]);
        return Promise.resolve(detail);
      },
      getDocumentoOriginal: (id) => {
        requests.push(["original", id]);
        return Promise.reject(new Error("Original sintético no disponible"));
      },
      getRevisiones: (id) => {
        requests.push(["reviews", id]);
        return Promise.resolve(events);
      },
    },
    (state) => updates.push(state),
  );
  await flushPromises();

  const latest = updates.at(-1);
  assert.deepEqual(requests, [
    ["detail", detail.documento_id],
    ["original", detail.documento_id],
    ["reviews", detail.documento_id],
  ]);
  assert.deepEqual(latest.detail, { status: "loaded", value: detail });
  assert.deepEqual(latest.original, {
    status: "error",
    error: "Original sintético no disponible",
  });
  assert.deepEqual(latest.reviews, { status: "loaded", value: events });
  cancel();
});

test("cancelled document loads cannot replace a newer active document", async () => {
  const detail = deferred();
  const original = deferred();
  const reviews = deferred();
  const newDetail = deferred();
  const newDocument = syntheticDocument({ documento_id: "SYNTHETIC-NEW-DOCUMENT" });
  const updates = [];
  const publish = (state) => updates.push(state);
  const cancelOld = startDocumentReviewLoad(
    "SYNTHETIC-OLD-DOCUMENT",
    {
      getDetalleTriaje: () => detail.promise,
      getDocumentoOriginal: () => original.promise,
      getRevisiones: () => reviews.promise,
    },
    publish,
  );
  cancelOld();
  const cancelNew = startDocumentReviewLoad(
    newDocument.documento_id,
    {
      getDetalleTriaje: () => newDetail.promise,
      getDocumentoOriginal: () => Promise.reject(new Error("Sin original sintético")),
      getRevisiones: () => Promise.resolve([]),
    },
    publish,
  );
  newDetail.resolve(newDocument);
  await flushPromises();
  const beforeOldResults = [...updates];
  assert.equal(updates.at(-1).detail.value.documento_id, newDocument.documento_id);

  detail.resolve(syntheticDocument({ documento_id: "SYNTHETIC-OLD-DOCUMENT" }));
  original.resolve({ blob: new Blob(["synthetic"]), contentType: "image/png" });
  reviews.resolve([]);
  await flushPromises();

  assert.equal(updates.length, 3);
  assert.deepEqual(updates, beforeOldResults);
  assert.ok(updates.every((state) => state.documentId === newDocument.documento_id));
  assert.equal(updates.at(-1).detail.value.documento_id, newDocument.documento_id);
  cancelNew();
});

test("original preview accepts only safe response MIME and cleans object URLs", () => {
  assert.equal(getOriginalPreviewKind("application/pdf; charset=binary"), "pdf");
  assert.equal(getOriginalPreviewKind(" IMAGE/PNG "), "image");
  assert.equal(getOriginalPreviewKind("image/jpeg"), "image");
  assert.equal(getOriginalPreviewKind("text/html"), null);
  assert.equal(getOriginalPreviewKind("image/svg+xml"), null);
  assert.equal(getOriginalPreviewKind(null), null);

  const allocated = [];
  const revoked = [];
  for (const [contentType, blobType, kind] of [
    ["application/pdf; charset=binary", "application/pdf", "pdf"],
    [" IMAGE/PNG ", "image/png", "image"],
    ["image/jpeg", "image/jpeg", "image"],
  ]) {
    const lease = createOriginalPreviewLease(
      {
        blob: new Blob(["synthetic"], { type: blobType }),
        contentType,
        filename: kind === "pdf" ? "source-from-response.pdf" : undefined,
      },
      {
        createObjectURL: () => {
          const url = `blob:synthetic-preview-${allocated.length + 1}`;
          allocated.push(url);
          return url;
        },
        revokeObjectURL: (url) => revoked.push(url),
      },
    );
    assert.deepEqual(
      { kind: lease.kind, url: lease.url },
      { kind, url: allocated.at(-1) },
    );
    lease.dispose();
    lease.dispose();
  }
  assert.equal(allocated.length, 3);
  assert.deepEqual(revoked, allocated);
});

test("unknown or mismatched MIME never creates an executable object URL", () => {
  let createCalls = 0;
  let revokeCalls = 0;
  for (const [contentType, blobType] of [
    [null, "image/png"],
    ["text/html", "text/html"],
    ["image/svg+xml", "image/svg+xml"],
    ["application/pdf", "text/html"],
    ["application/pdf", "image/png"],
    ["image/jpeg", "application/pdf"],
  ]) {
    const lease = createOriginalPreviewLease(
      { blob: new Blob(["synthetic"], { type: blobType }), contentType },
      {
        createObjectURL: () => {
          createCalls += 1;
          return "blob:synthetic-unsafe";
        },
        revokeObjectURL: () => { revokeCalls += 1; },
      },
    );
    assert.equal(lease.kind, null);
    assert.equal(lease.url, null);
    lease.dispose();
    lease.dispose();
    assert.equal(createCalls, 0);
    assert.equal(revokeCalls, 0);
  }
});
