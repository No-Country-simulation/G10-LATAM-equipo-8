import assert from "node:assert/strict";
import test from "node:test";
import {
  countUrgentAlerts,
  createDocumentCollectionsController,
  filterCollectionDocuments,
} from "../src/hooks/documentCollectionsController.ts";
import {
  createDocumentUploadController,
  prioridadClinicaLegible,
} from "../src/hooks/documentUploadController.ts";
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

test("document search ignores accents in patient names, document IDs and the query", () => {
  const accented = syntheticDocument({
    documento_id: "T2-ÁCTIVO",
    datos_extraidos: { paciente: { nombre: "Álvaro Demo" } },
    decision_enrutamiento: { alerta_urgente: true },
  });
  const plain = syntheticDocument({
    documento_id: "T2-PLAIN",
    datos_extraidos: { paciente: { nombre: "Alvaro Demo" } },
  });
  const source = page([accented, plain], 41, 20, 20);
  const before = JSON.stringify(source);

  for (const search of ["alvaro demo", "ÁLVARO DÉMO", "A\u0301lvaro De\u0301mo"]) {
    const matches = filterCollectionDocuments(source.items, { search, documentType: "" });
    assert.equal(matches.length, 2, "both query and document accents must be ignored");
    assert.ok(matches[0] === accented && matches[1] === plain, "matching preserves DTO references and order");
    const urgent = filterCollectionDocuments(source.items, { search, documentType: "" }, true);
    assert.equal(urgent.length, 1);
    assert.ok(urgent[0] === accented);
  }
  const identifierMatch = filterCollectionDocuments(source.items, {
    search: "t2-activo",
    documentType: "",
  });
  assert.equal(identifierMatch.length, 1);
  assert.ok(identifierMatch[0] === accented);
  assert.ok(JSON.stringify(source) === before, "search must not rewrite displayed values, DTOs or page metadata");
});

test("existing search trimming, case, type and urgent-only behavior is preserved", () => {
  const urgent = syntheticDocument({
    documento_id: "T2-Mixed-Case",
    datos_extraidos: { paciente: { nombre: "Demo Neutral" } },
    decision_enrutamiento: { alerta_urgente: true },
  });
  const other = syntheticDocument({
    documento_id: "T2-OTHER",
    clasificacion: { tipo_documento: "Otro tipo" },
  });
  const source = [urgent, other];
  const before = JSON.stringify(source);
  assert.equal(filterCollectionDocuments(source, { search: "", documentType: "" }).length, 2);
  for (const urgentOnly of [false, true]) {
    const matches = filterCollectionDocuments(source, {
      search: "  t2-MIXED-case  ",
      documentType: "Orden de Procedimiento",
    }, urgentOnly);
    assert.equal(matches.length, 1);
    assert.ok(matches[0] === urgent);
    assert.equal(filterCollectionDocuments(source, {
      search: "t2-mixed-case",
      documentType: "Otro tipo",
    }, urgentOnly).length, 0);
    assert.equal(filterCollectionDocuments(source, {
      search: "   ",
      documentType: "Orden de Procedimiento",
    }, urgentOnly).length, 1);
  }
  assert.ok(JSON.stringify(source) === before, "existing filtering must remain non-mutating");
});

test("approved documents remain in All documents but leave the immediate-alert list and count", () => {
  const approvedUrgent = syntheticDocument({
    documento_id: "T3-APPROVED-URGENT",
    status: "APPROVED",
    decision_enrutamiento: { alerta_urgente: true },
  });
  const needsAuditUrgent = syntheticDocument({
    documento_id: "T3-NEEDS-AUDIT",
    decision_enrutamiento: { alerta_urgente: true },
  });
  const approvedRoutine = syntheticDocument({ documento_id: "T3-APPROVED-ROUTINE", status: "APPROVED" });
  const source = page([approvedUrgent, needsAuditUrgent, approvedRoutine], 41, 20, 20);
  const before = JSON.stringify(source);
  const filters = { search: "", documentType: "" };

  const all = filterCollectionDocuments(source.items, filters);
  assert.equal(all.length, 3);
  assert.ok(all[0] === approvedUrgent && all[2] === approvedRoutine);
  const alerts = filterCollectionDocuments(source.items, filters, true);
  assert.equal(alerts.length, 1, "APPROVED must not remain visible in immediate alerts");
  assert.ok(alerts[0] === needsAuditUrgent);
  assert.equal(countUrgentAlerts(source.items), 1, "the alert count must use the same eligibility as its list");
  assert.equal(filterCollectionDocuments(source.items, {
    search: "t3-approved-urgent",
    documentType: "",
  }).length, 1, "approval must not hide the document from All documents");
  assert.ok(JSON.stringify(source) === before, "view filtering must not clear urgency or change DTOs, totals or pagination");
});

test("non-approved urgent flags retain their previous list and count behavior", () => {
  const needsAudit = syntheticDocument({ decision_enrutamiento: { alerta_urgente: true } });
  const rejected = syntheticDocument({
    status: "REJECTED",
    decision_enrutamiento: { alerta_urgente: true },
  });
  const routine = syntheticDocument({
    clasificacion: { nivel_prioridad: "Urgente" },
    decision_enrutamiento: { alerta_urgente: false },
  });
  const source = [needsAudit, rejected, routine];
  const before = JSON.stringify(source);
  const alerts = filterCollectionDocuments(source, { search: "", documentType: "" }, true);
  assert.equal(alerts.length, 2);
  assert.ok(alerts[0] === needsAudit && alerts[1] === rejected);
  assert.equal(countUrgentAlerts(source), 2);
  assert.equal(filterCollectionDocuments(source, { search: "", documentType: "" }).length, 3);
  assert.ok(JSON.stringify(source) === before, "the stored flag still defines urgency for every other status");
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

test("a confirmed synthetic upload stays confirmed when aggregate collection refresh fails and preserves the old page and selection", async () => {
  const historyRecord = syntheticDocument({ documento_id: "HISTORY-RETAINED-001" });
  const auditRecord = syntheticDocument({ documento_id: "AUDIT-RETAINED-001" });
  const uploaded = syntheticDocument({ documento_id: "UPLOAD-CONFIRMED-001" });
  let failRefresh = false;
  let uploadRequests = 0;
  const service = {
    getTriajes: ({ offset = 0, limit = 20 }) =>
      failRefresh
        ? Promise.reject(new Error("historial no disponible"))
        : Promise.resolve(page([historyRecord], 41, offset, limit)),
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      failRefresh
        ? Promise.reject(new Error("cola no disponible"))
        : Promise.resolve(page([auditRecord], 2, offset, limit)),
  };
  const collections = createDocumentCollectionsController(service);
  await collections.loadInitial();
  await collections.loadHistoryPage(20);
  collections.openDocument(historyRecord);
  const previousCollections = collections.getSnapshot();
  failRefresh = true;

  const upload = createDocumentUploadController({
    uploadFile: async () => {
      uploadRequests += 1;
      return uploaded;
    },
    onConfirmed: collections.refreshCollections,
  });
  const result = await upload.upload(
    new File(["synthetic upload"], "synthetic.pdf", { type: "application/pdf" }),
  );

  assert.equal(result, uploaded);
  assert.equal(uploadRequests, 1);
  assert.equal(upload.getSnapshot().phase, "confirmed");
  assert.equal(upload.getSnapshot().confirmedDocument, uploaded);
  assert.equal(upload.getSnapshot().error, null);
  assert.match(upload.getSnapshot().collectionRefreshError, /historial no disponible/);
  assert.match(upload.getSnapshot().collectionRefreshError, /cola no disponible/);

  const afterRefresh = collections.getSnapshot();
  assert.deepEqual(afterRefresh.history.items, previousCollections.history.items);
  assert.deepEqual(afterRefresh.auditQueue.items, previousCollections.auditQueue.items);
  assert.equal(afterRefresh.history.total, previousCollections.history.total);
  assert.equal(afterRefresh.auditQueue.total, previousCollections.auditQueue.total);
  assert.equal(afterRefresh.history.offset, 20);
  assert.equal(afterRefresh.selectedDocument, historyRecord);
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
