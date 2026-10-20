import assert from "node:assert/strict";
import test from "node:test";
import {
  countUrgentAlerts,
  createDocumentCollectionsController,
  filterCollectionDocuments,
} from "../src/hooks/documentCollectionsController.ts";
import { prioridadClinicaLegible } from "../src/hooks/documentUploadController.ts";
import { createTriajeService } from "../src/services/triajeServiceCore.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

function page(items, total = items.length, offset = 0, limit = 20) {
  return { items, total, offset, limit };
}

function apiService(respond) {
  const requests = [];
  const service = createTriajeService({
    apiBaseUrl: "http://mediflow.test/api/v1",
    fetchImpl: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, init });
      return new Response(JSON.stringify(respond(url)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  return { service, requests };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("collections use only supported server filters and derive initial totals from loaded DTO pages", async () => {
  const documents = [
    syntheticDocument({ documento_id: "FRONTEND-REVISION-001" }),
    syntheticDocument({
      documento_id: "FRONTEND-FALLO-001",
      processing_status: "FAILED",
      processing_error: "GEMINI_TIMEOUT",
      clasificacion: { nivel_prioridad: null },
    }),
  ];
  const { service, requests } = apiService((url) =>
    url.pathname.endsWith("/audit/queue")
      ? page(documents, 2, Number(url.searchParams.get("offset")), 20)
      : page(documents, 2, Number(url.searchParams.get("offset")), 20),
  );
  const controller = createDocumentCollectionsController(service);

  const initialLoad = controller.loadInitial();
  assert.equal(controller.loadInitial(), initialLoad, "the initial request is shared under StrictMode");
  await initialLoad;
  const loaded = controller.getSnapshot();
  assert.equal(loaded.history.total, 2);
  assert.equal(loaded.auditQueue.total, 2);
  assert.equal(countUrgentAlerts(loaded.history.items), 0);
  assert.deepEqual(
    requests.map(({ url }) => [url.pathname, [...url.searchParams.entries()]]),
    [
      ["/api/v1/triajes", [["offset", "0"], ["limit", "20"]]],
      ["/api/v1/audit/queue", [["offset", "0"], ["limit", "20"]]],
    ],
  );

  controller.setSearch("Paciente que no está en la página");
  controller.setDocumentType("Tipo documental no cargado");
  assert.equal(requests.length, 2, "search and type filters stay on the loaded page");
  assert.deepEqual(
    filterCollectionDocuments(loaded.history.items, {
      search: controller.getSnapshot().search,
      documentType: controller.getSnapshot().documentType,
    }),
    [],
  );

  await controller.setReviewStatus("NEEDS_AUDIT");
  const historyRequest = requests[2].url;
  assert.equal(historyRequest.pathname, "/api/v1/triajes");
  assert.deepEqual([...historyRequest.searchParams.entries()], [
    ["offset", "0"],
    ["limit", "20"],
    ["status", "NEEDS_AUDIT"],
  ]);
  assert.equal(requests.some(({ url }) => url.searchParams.has("status") && url.pathname.endsWith("/audit/queue")), false);
  assert.equal(prioridadClinicaLegible(documents[1].clasificacion.nivel_prioridad), "Sin evaluar");
  assert.equal(prioridadClinicaLegible(documents[0].clasificacion.nivel_prioridad), "Rutinaria");
});

test("urgent alerts and local filters stay scoped to the loaded page without changing server pagination", () => {
  const urgent = syntheticDocument({
    documento_id: "ALERTA-001",
    decision_enrutamiento: { alerta_urgente: true },
  });
  const routine = syntheticDocument({ documento_id: "NO-ALERTA-001" });
  const source = [urgent, routine];
  const original = structuredClone(source);

  assert.equal(countUrgentAlerts(source), 1);
  assert.deepEqual(
    filterCollectionDocuments(source, { search: "sin coincidencia", documentType: "" }, true),
    [],
  );
  assert.deepEqual(
    filterCollectionDocuments(source, { search: "ALERTA-001", documentType: "" }, true),
    [urgent],
  );
  assert.equal(page(source, 41, 0, 20).total, 41);
  assert.equal(page(source, 41, 0, 20).offset + page(source, 41, 0, 20).limit < 41, true);
  assert.deepEqual(source, original, "filtering must not mutate source DTOs");
});

test("late page and status-query responses cannot replace the latest history request", async () => {
  const firstPage = deferred();
  const secondPage = deferred();
  const olderStatus = deferred();
  const newerStatus = deferred();
  const requests = [];
  const service = {
    getTriajes: ({ offset, limit, status = "" }) => {
      requests.push({ offset, status });
      if (offset === 20) return firstPage.promise;
      if (offset === 40) return secondPage.promise;
      if (status === "NEEDS_AUDIT") return olderStatus.promise;
      if (status === "APPROVED") return newerStatus.promise;
      return Promise.resolve(page([], 60, offset, limit));
    },
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      Promise.resolve(page([], 0, offset, limit)),
  };
  const controller = createDocumentCollectionsController(service);
  await controller.loadInitial();

  const olderRequest = controller.loadHistoryPage(20);
  const newerRequest = controller.loadHistoryPage(40);
  secondPage.resolve(page([syntheticDocument({ documento_id: "PAGE-40" })], 60, 40, 20));
  await newerRequest;
  firstPage.resolve(page([syntheticDocument({ documento_id: "PAGE-20" })], 60, 20, 20));
  await olderRequest;

  assert.deepEqual(requests.slice(0, 3), [
    { offset: 0, status: "" },
    { offset: 20, status: "" },
    { offset: 40, status: "" },
  ]);
  assert.equal(controller.getSnapshot().history.offset, 40);
  assert.equal(controller.getSnapshot().history.items[0].documento_id, "PAGE-40");

  const staleFilter = controller.setReviewStatus("NEEDS_AUDIT");
  const currentFilter = controller.setReviewStatus("APPROVED");
  newerStatus.resolve(page([syntheticDocument({ documento_id: "APPROVED-PAGE" })], 1, 0, 20));
  await currentFilter;
  olderStatus.resolve(page([syntheticDocument({ documento_id: "STALE-PENDING-PAGE" })], 1, 0, 20));
  await staleFilter;
  assert.equal(controller.getSnapshot().reviewStatusFilter, "APPROVED");
  assert.equal(controller.getSnapshot().history.items[0].documento_id, "APPROVED-PAGE");
});

test("opening and closing any loaded case retains collection filters and page", async () => {
  const terminalFailure = syntheticDocument({
    documento_id: "FRONTEND-FALLO-001",
    processing_status: "FAILED",
    processing_error: "GEMINI_TIMEOUT",
    clasificacion: { nivel_prioridad: null },
  });
  const service = {
    getTriajes: ({ offset = 0, limit = 20 }) =>
      Promise.resolve(page([terminalFailure], 45, offset, limit)),
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      Promise.resolve(page([terminalFailure], 2, offset, limit)),
  };
  const controller = createDocumentCollectionsController(service);
  await controller.loadInitial();
  await controller.setReviewStatus("NEEDS_AUDIT");
  await controller.loadHistoryPage(20);
  controller.setSearch("GEMINI_TIMEOUT");
  controller.setDocumentType("Orden de Procedimiento");

  const selected = controller.getSnapshot().history.items[0];
  controller.openDocument(selected);
  assert.equal(controller.getSnapshot().selectedDocument, terminalFailure);
  controller.closeDocument();

  const afterClose = controller.getSnapshot();
  assert.equal(afterClose.selectedDocument, null);
  assert.equal(afterClose.history.offset, 20, "closing the modal keeps the selected history page");
  assert.equal(afterClose.reviewStatusFilter, "NEEDS_AUDIT");
  assert.equal(afterClose.search, "GEMINI_TIMEOUT");
  assert.equal(afterClose.documentType, "Orden de Procedimiento");
  assert.equal(afterClose.history.total, 45);
});

test("refresh propagates both collection errors while retaining the last confirmed pages", async () => {
  const historyRecord = syntheticDocument({ documento_id: "HISTORY-001" });
  const auditRecord = syntheticDocument({ documento_id: "AUDIT-001" });
  let failRefresh = false;
  const service = {
    getTriajes: ({ offset = 0, limit = 20 }) =>
      failRefresh
        ? Promise.reject(new Error("historial no disponible"))
        : Promise.resolve(page([historyRecord], 1, offset, limit)),
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      failRefresh
        ? Promise.reject(new Error("cola no disponible"))
        : Promise.resolve(page([auditRecord], 1, offset, limit)),
  };
  const controller = createDocumentCollectionsController(service);
  await controller.loadInitial();
  const beforeRefresh = controller.getSnapshot();
  failRefresh = true;

  await assert.rejects(
    controller.refreshCollections(),
    /No se pudo actualizar el historial: historial no disponible; No se pudo actualizar la cola de auditoría: cola no disponible/,
  );
  const afterRefresh = controller.getSnapshot();
  assert.deepEqual(afterRefresh.history.items, beforeRefresh.history.items);
  assert.deepEqual(afterRefresh.auditQueue.items, beforeRefresh.auditQueue.items);
  assert.equal(afterRefresh.historyError, "historial no disponible");
  assert.equal(afterRefresh.auditQueueError, "cola no disponible");
});

test("collection loading exposes errors and retries without fabricating or clearing loaded data", async () => {
  const known = syntheticDocument({ documento_id: "KNOWN-001" });
  let historyCalls = 0;
  const service = {
    getTriajes: ({ offset = 0, limit = 20 }) => {
      historyCalls += 1;
      if (historyCalls === 1) return Promise.reject(new Error("historial no disponible"));
      return Promise.resolve(page([known], 1, offset, limit));
    },
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      Promise.resolve(page([], 0, offset, limit)),
  };
  const controller = createDocumentCollectionsController(service);

  await controller.loadInitial();
  assert.equal(controller.getSnapshot().historyState, "error");
  assert.equal(controller.getSnapshot().historyError, "historial no disponible");
  assert.equal(controller.getSnapshot().history.total, 0);
  assert.equal(controller.getSnapshot().hasHistory, false);

  await controller.retryHistory();
  assert.equal(controller.getSnapshot().historyState, "loaded");
  assert.equal(controller.getSnapshot().history.items[0].documento_id, "KNOWN-001");
  assert.equal(controller.getSnapshot().history.total, 1);
  assert.equal(historyCalls, 2);
});
