import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentCollectionsController } from "../src/hooks/documentCollectionsController.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

function page(items, total = items.length, offset = 0, limit = 20) {
  return { items, total, offset, limit };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function auditPage({ offset = 0, limit = 20 }) {
  return Promise.resolve(page([], 0, offset, limit));
}

test("initial unfiltered history supplies the global total without another default read", async () => {
  const document = syntheticDocument({ documento_id: "T10-GLOBAL-001" });
  const requests = [];
  const controller = createDocumentCollectionsController({
    getTriajes: (filters) => {
      requests.push({ collection: "history", ...filters });
      return Promise.resolve(page([document], 19, filters.offset, filters.limit));
    },
    getAuditQueue: (filters) => {
      requests.push({ collection: "audit", ...filters });
      return auditPage(filters);
    },
  });

  await controller.loadInitial();

  assert.equal(controller.getSnapshot().allDocumentsTotal, 19);
  assert.equal(controller.getSnapshot().history.items.length, 1);
  assert.equal(controller.getSnapshot().history.total, 19);
  assert.deepEqual(requests, [
    { collection: "history", offset: 0, limit: 20 },
    { collection: "audit", offset: 0, limit: 20 },
  ], "the successful unfiltered response is reused instead of issuing a default unfiltered read");
});

test("a filtered history total stays query-scoped while the All documents total stays global", async () => {
  const document = syntheticDocument({ documento_id: "T10-FILTERED-001" });
  const requests = [];
  const controller = createDocumentCollectionsController({
    getTriajes: (filters) => {
      requests.push({ collection: "history", ...filters });
      return Promise.resolve(
        filters.status
          ? page([document], 3, filters.offset, filters.limit)
          : page([document], 19, filters.offset, filters.limit),
      );
    },
    getAuditQueue: (filters) => {
      requests.push({ collection: "audit", ...filters });
      return auditPage(filters);
    },
  });

  await controller.loadInitial();
  await controller.setReviewStatus("NEEDS_AUDIT");

  const filtered = controller.getSnapshot();
  assert.equal(filtered.history.total, 3, "pagination remains scoped to the selected history status");
  assert.equal(filtered.allDocumentsTotal, 19, "navigation uses the genuine unfiltered server total, not 3");
  assert.deepEqual(requests, [
    { collection: "history", offset: 0, limit: 20 },
    { collection: "audit", offset: 0, limit: 20 },
    { collection: "history", offset: 0, limit: 20, status: "NEEDS_AUDIT" },
    { collection: "history", offset: 0, limit: 20 },
  ]);
});

test("known zero stays distinct from unknown when a separate global read fails", async () => {
  const emptyController = createDocumentCollectionsController({
    getTriajes: ({ offset, limit }) => Promise.resolve(page([], 0, offset, limit)),
    getAuditQueue: auditPage,
  });
  await emptyController.loadInitial();
  assert.equal(emptyController.getSnapshot().allDocumentsTotal, 0);

  const document = syntheticDocument({ documento_id: "T10-UNKNOWN-001" });
  const unknownController = createDocumentCollectionsController({
    getTriajes: (filters) => filters.status
      ? Promise.resolve(page([document], 3, filters.offset, filters.limit))
      : Promise.reject(new Error("global total unavailable")),
    getAuditQueue: auditPage,
  });
  await unknownController.loadInitial();
  await unknownController.setReviewStatus("NEEDS_AUDIT");

  const unknown = unknownController.getSnapshot();
  assert.equal(unknown.allDocumentsTotal, null);
  assert.equal(unknown.history.total, 3);
  assert.equal(unknown.historyState, "loaded");
  assert.equal(unknown.historyError, null, "the extra count failure does not replace successful filtered history");
  assert.equal(unknown.auditQueueState, "loaded");
  assert.equal(unknown.auditQueueError, null);
});

test("a failed extra count refresh retains the last-good global total and successful collections", async () => {
  const document = syntheticDocument({ documento_id: "T10-LAST-GOOD-001" });
  let failGlobalRead = false;
  const controller = createDocumentCollectionsController({
    getTriajes: (filters) => {
      if (filters.status) return Promise.resolve(page([document], 3, filters.offset, filters.limit));
      if (failGlobalRead) return Promise.reject(new Error("global total unavailable"));
      return Promise.resolve(page([document], 19, filters.offset, filters.limit));
    },
    getAuditQueue: auditPage,
  });

  await controller.loadInitial();
  await controller.setReviewStatus("NEEDS_AUDIT");
  failGlobalRead = true;
  await controller.refreshCollections({ background: true });

  const refreshed = controller.getSnapshot();
  assert.equal(refreshed.allDocumentsTotal, 19);
  assert.equal(refreshed.history.total, 3);
  assert.equal(refreshed.history.items[0], document);
  assert.equal(refreshed.historyState, "loaded");
  assert.equal(refreshed.historyError, null);
  assert.equal(refreshed.auditQueueState, "loaded");
  assert.equal(refreshed.auditQueueError, null);
});

test("an older filtered total response cannot replace a newer authoritative total", async () => {
  const staleCount = deferred();
  const latestCount = deferred();
  const document = syntheticDocument({ documento_id: "T10-FRESHNESS-001" });
  let globalReads = 0;
  const controller = createDocumentCollectionsController({
    getTriajes: (filters) => {
      if (filters.status) return Promise.resolve(page([document], 3, filters.offset, filters.limit));
      globalReads += 1;
      if (globalReads === 1) return Promise.resolve(page([document], 19, filters.offset, filters.limit));
      if (globalReads === 2) return staleCount.promise;
      if (globalReads === 3) return latestCount.promise;
      throw new Error("unexpected global read");
    },
    getAuditQueue: auditPage,
  });

  await controller.loadInitial();
  const statusChange = controller.setReviewStatus("NEEDS_AUDIT");
  const newerRefresh = controller.refreshCollections();

  latestCount.resolve(page([document], 23));
  await newerRefresh;
  assert.equal(controller.getSnapshot().allDocumentsTotal, 23);

  staleCount.resolve(page([document], 19));
  await statusChange;
  assert.equal(controller.getSnapshot().allDocumentsTotal, 23);
});
