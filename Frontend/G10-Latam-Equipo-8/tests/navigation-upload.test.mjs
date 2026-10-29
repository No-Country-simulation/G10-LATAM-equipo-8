import assert from "node:assert/strict";
import test from "node:test";
import {
  createDocumentUploadController,
  validateSupportedUploadFile,
} from "../src/hooks/documentUploadController.ts";
import {
  DASHBOARD_DESTINATIONS,
  isActiveDashboardView,
} from "../src/types/navigation.ts";

function archivo(name, type) {
  return new File(["synthetic file bytes"], name, { type });
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

function documento(overrides = {}) {
  return {
    documento_id: "UPLOAD-001",
    status: "NEEDS_AUDIT",
    processing_status: "SUCCEEDED",
    processing_error: null,
    ...overrides,
  };
}

test("the four same-level destinations use exact labels and expose a single active context", () => {
  assert.deepEqual(
    DASHBOARD_DESTINATIONS.map(({ label }) => label),
    ["Cargar documentos", "Pendientes", "Todos los documentos", "Alertas inmediatas"],
  );
  assert.equal(new Set(DASHBOARD_DESTINATIONS.map(({ view }) => view)).size, 4);

  for (const active of DASHBOARD_DESTINATIONS) {
    const activeViews = DASHBOARD_DESTINATIONS.filter(({ view }) =>
      isActiveDashboardView(active.view, view),
    );
    assert.deepEqual(activeViews.map(({ view }) => view), [active.view]);
  }
});

test("one in-flight upload is shared across destination observers and does not change navigation", async () => {
  const request = deferred();
  const result = documento();
  const requests = [];
  const confirmed = [];
  const controller = createDocumentUploadController({
    uploadFile: (file) => {
      requests.push(file.name);
      return request.promise;
    },
    onConfirmed: (uploaded) => confirmed.push(uploaded),
  });
  const uploadDestinationSnapshots = [];
  const pendingDestinationSnapshots = [];
  controller.subscribe(() => uploadDestinationSnapshots.push(controller.getSnapshot()));
  controller.subscribe(() => pendingDestinationSnapshots.push(controller.getSnapshot()));

  let activeDestination = "Cargar documentos";
  const firstRequest = controller.upload(archivo("solicitud.pdf", "application/pdf"));
  activeDestination = "Pendientes";
  const duplicateRequest = controller.upload(archivo("otra.png", "image/png"));
  await Promise.resolve();

  assert.equal(requests.length, 1);
  assert.deepEqual(requests, ["solicitud.pdf"]);
  assert.equal(firstRequest, duplicateRequest);
  assert.equal(controller.getSnapshot().phase, "uploading");
  assert.equal(controller.getSnapshot().fileName, "solicitud.pdf");
  assert.equal(uploadDestinationSnapshots.at(-1).phase, "uploading");
  assert.equal(pendingDestinationSnapshots.at(-1).fileName, "solicitud.pdf");

  request.resolve(result);
  assert.equal(await firstRequest, result);
  assert.equal(activeDestination, "Pendientes");
  assert.equal(controller.getSnapshot().phase, "confirmed");
  assert.equal(controller.getSnapshot().confirmedDocument, result);
  assert.equal(confirmed.length, 1);
  assert.equal(pendingDestinationSnapshots.at(-1).confirmedDocument, result);
});

test("a rejected upload preserves the prior confirmed result and collection totals", async () => {
  const firstResult = documento();
  let historyTotal = 2;
  let auditTotal = 1;
  let requestCount = 0;
  const controller = createDocumentUploadController({
    uploadFile: async () => {
      requestCount += 1;
      if (requestCount === 1) return firstResult;
      throw new Error("Error HTTP 413: archivo demasiado grande");
    },
    onConfirmed: (uploaded) => {
      historyTotal += 1;
      if (uploaded.status === "NEEDS_AUDIT") auditTotal += 1;
    },
  });

  assert.equal(await controller.upload(archivo("primero.pdf", "application/pdf")), firstResult);
  const totalsAfterConfirmation = { historyTotal, auditTotal };
  const rejected = await controller.upload(archivo("segundo.jpg", "image/jpeg"));

  assert.equal(rejected, null);
  assert.deepEqual({ historyTotal, auditTotal }, totalsAfterConfirmation);
  assert.equal(controller.getSnapshot().phase, "failed");
  assert.equal(controller.getSnapshot().fileName, "segundo.jpg");
  assert.match(controller.getSnapshot().error, /413/);
  assert.equal(controller.getSnapshot().confirmedDocument, firstResult);
  assert.equal(requestCount, 2);
});

test("supported file formats are accepted and unsupported or mismatched selections are rejected before transport", async () => {
  for (const supported of [
    archivo("informe.pdf", "application/pdf"),
    archivo("imagen.png", "image/png"),
    archivo("foto.jpg", "image/jpeg"),
    archivo("foto.JPEG", "image/jpeg"),
  ]) {
    assert.equal(validateSupportedUploadFile(supported), null);
  }

  assert.match(validateSupportedUploadFile(archivo("animacion.gif", "image/gif")), /PDF, PNG.*JPG/i);
  assert.match(validateSupportedUploadFile(archivo("documento.pdf", "image/png")), /no coincide/i);

  let requests = 0;
  const controller = createDocumentUploadController({
    uploadFile: async () => {
      requests += 1;
      return documento();
    },
  });
  assert.equal(await controller.upload(archivo("animacion.gif", "image/gif")), null);
  assert.equal(requests, 0);
  assert.equal(controller.getSnapshot().phase, "failed");
  assert.match(controller.getSnapshot().error, /PDF, PNG.*JPG/i);
});

test("a 201 FAILED DTO is a confirmed recorded result, not a successful extraction", async () => {
  const failedResult = documento({
    documento_id: "UPLOAD-FAILED-001",
    processing_status: "FAILED",
    processing_error: "GEMINI_TIMEOUT",
  });
  const confirmed = [];
  const controller = createDocumentUploadController({
    uploadFile: async () => failedResult,
    onConfirmed: (uploaded) => confirmed.push(uploaded),
  });

  assert.equal(await controller.upload(archivo("fallo.pdf", "application/pdf")), failedResult);
  assert.equal(controller.getSnapshot().phase, "confirmed");
  assert.equal(controller.getSnapshot().error, null);
  assert.equal(controller.getSnapshot().confirmedDocument.processing_status, "FAILED");
  assert.equal(controller.getSnapshot().confirmedDocument.processing_error, "GEMINI_TIMEOUT");
  assert.deepEqual(confirmed, [failedResult]);
});

test("a collection refresh error remains separate from a confirmed upload", async () => {
  const savedResult = documento({ documento_id: "UPLOAD-SAVED-001" });
  const controller = createDocumentUploadController({
    uploadFile: async () => savedResult,
    onConfirmed: async () => {
      throw new Error("No se pudo actualizar la lista");
    },
  });

  assert.equal(await controller.upload(archivo("guardado.pdf", "application/pdf")), savedResult);
  assert.equal(controller.getSnapshot().phase, "confirmed");
  assert.equal(controller.getSnapshot().error, null);
  assert.equal(controller.getSnapshot().confirmedDocument, savedResult);
  assert.match(controller.getSnapshot().collectionRefreshError, /actualizar la lista/);
});

test("confirmed upload history retains each result newest-first through refresh errors", async () => {
  const firstResult = documento({ documento_id: "UPLOAD-HISTORY-001" });
  const secondResult = documento({ documento_id: "UPLOAD-HISTORY-002" });
  const confirmed = [];
  const controller = createDocumentUploadController({
    uploadFile: async (file) => file.name === "segundo.pdf" ? secondResult : firstResult,
    onConfirmed: async (uploaded) => {
      confirmed.push(uploaded.documento_id);
      if (uploaded === secondResult) throw new Error("No se pudo actualizar la lista");
    },
  });

  await controller.upload(archivo("primero.pdf", "application/pdf"));
  await controller.upload(archivo("segundo.pdf", "application/pdf"));

  const results = controller.getSnapshot().confirmedResults;
  assert.deepEqual(
    results.map(({ document, fileName }) => [document.documento_id, fileName]),
    [
      ["UPLOAD-HISTORY-002", "segundo.pdf"],
      ["UPLOAD-HISTORY-001", "primero.pdf"],
    ],
  );
  assert.equal(results.length, 2);
  assert.deepEqual(confirmed, ["UPLOAD-HISTORY-001", "UPLOAD-HISTORY-002"]);
  assert.equal(controller.getSnapshot().confirmedDocument, secondResult);
  assert.match(controller.getSnapshot().collectionRefreshError, /actualizar la lista/);
});

test("invalid and rejected uploads preserve confirmed history and confirmation counts", async () => {
  const savedResult = documento({ documento_id: "UPLOAD-RETAINED-001" });
  let requests = 0;
  let confirmations = 0;
  const controller = createDocumentUploadController({
    uploadFile: async () => {
      requests += 1;
      if (requests === 1) return savedResult;
      throw new Error("Error HTTP 413: archivo demasiado grande");
    },
    onConfirmed: () => { confirmations += 1; },
  });
  await controller.upload(archivo("guardado.pdf", "application/pdf"));
  const originalHistory = controller.getSnapshot().confirmedResults.map(
    ({ document, fileName }) => [document.documento_id, fileName],
  );

  assert.equal(await controller.upload(archivo("invalido.gif", "image/gif")), null);
  assert.deepEqual(
    controller.getSnapshot().confirmedResults.map(({ document, fileName }) => [document.documento_id, fileName]),
    originalHistory,
  );
  assert.equal(requests, 1);
  assert.equal(confirmations, 1);

  assert.equal(await controller.upload(archivo("rechazado.pdf", "application/pdf")), null);
  assert.deepEqual(
    controller.getSnapshot().confirmedResults.map(({ document, fileName }) => [document.documento_id, fileName]),
    originalHistory,
  );
  assert.equal(controller.getSnapshot().confirmedDocument, savedResult);
  assert.equal(requests, 2);
  assert.equal(confirmations, 1);
});
