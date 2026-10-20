import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAgeProposal,
  createReviewDraft,
  updateReviewDraft,
} from "../src/components/dashboard/reviewDraft.ts";
import { createDocumentReviewDecisionController } from "../src/hooks/documentReviewDecisionController.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function makeDecisionHarness({
  review = async (_documentId, _request) => syntheticDocument({ status: "APPROVED" }),
  getDetail = async (document) => document,
  refresh = async () => {},
  onConfirmed = () => {},
  onRefreshError = () => {},
} = {}) {
  const calls = [];
  const refreshErrors = [];
  const service = {
    revisarDocumento(documentId, request) {
      calls.push({ documentId, request: structuredClone(request) });
      return review(documentId, request);
    },
    getDetalleTriaje(documentId) {
      return getDetail(documentId);
    },
  };
  const controller = createDocumentReviewDecisionController(service, {
    refreshCollections: refresh,
    onDecisionConfirmed: onConfirmed,
    onCollectionRefreshError(error) {
      refreshErrors.push(error);
      onRefreshError(error);
    },
  });
  return { controller, calls, refreshErrors };
}

function setRequiredApprovalFields(controller, destination = "HISTORIA_CLINICA") {
  controller.setField("reviewer", "  Dra. Sintética  ");
  controller.setField("comment", "  Revisión documentada  ");
  controller.setField("destination", destination);
  controller.setVerified(true);
}

function assertNoDraftMutation(document, draft, beforeDocument, beforeDraft) {
  assert.deepEqual(document, beforeDocument);
  assert.deepEqual(draft, beforeDraft);
}

test("approval requires declared reviewer, comment, explicit final destination, verification, and complete supported data", async () => {
  const document = syntheticDocument();
  const draft = createReviewDraft(document);
  const beforeDocument = structuredClone(document);
  const beforeDraft = structuredClone(draft);
  const { controller, calls } = makeDecisionHarness();

  controller.setVerified(true);
  await controller.approve(document, draft);
  assert.equal(calls.length, 0);
  assert.equal(controller.getSnapshot().phase, "error");
  assert.match(controller.getSnapshot().error, /revisor/i);

  setRequiredApprovalFields(controller, "REVISION_HUMANA");
  await controller.approve(document, draft);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /destino final/i);

  setRequiredApprovalFields(controller, "HISTORIA_CLINICA");
  const missingName = syntheticDocument({
    datos_extraidos: { paciente: { nombre: null } },
  });
  await controller.approve(missingName, createReviewDraft(missingName));
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /nombre de paciente/i);

  const failed = syntheticDocument({
    processing_status: "FAILED",
    processing_error: "SYNTHETIC_FAILURE",
    clasificacion: { nivel_prioridad: null },
    datos_extraidos: { paciente: { nombre: null } },
  });
  await controller.approve(failed, createReviewDraft(failed));
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /procesamiento|extracción/i);
  assertNoDraftMutation(document, draft, beforeDocument, beforeDraft);
});

test("urgent approval requires EMERGENCIA_MEDICA and each changed decision field invalidates verification", async () => {
  const document = syntheticDocument({ clasificacion: { nivel_prioridad: null } });
  const urgentDraft = updateReviewDraft(
    createReviewDraft(document),
    "priority",
    "Urgente",
  );
  const { controller, calls } = makeDecisionHarness();
  setRequiredApprovalFields(controller, "HISTORIA_CLINICA");

  await controller.approve(document, urgentDraft);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /Urgente.*EMERGENCIA_MEDICA/i);

  controller.setField("destination", "EMERGENCIA_MEDICA");
  assert.equal(controller.getSnapshot().form.verified, false);
  controller.setVerified(true);
  controller.setField("comment", "Comentario actualizado");
  assert.equal(controller.getSnapshot().form.verified, false);
  await controller.approve(document, urgentDraft);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /verific/i);
});

test("unsupported document types and invalid age boundaries are rejected without transport", async () => {
  const document = syntheticDocument();
  const { controller, calls } = makeDecisionHarness();
  setRequiredApprovalFields(controller);

  let invalidType = updateReviewDraft(
    createReviewDraft(document),
    "documentType",
    "Tipo inventado",
  );
  await controller.approve(document, invalidType);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /tipo de documento.*no está soportado/i);

  controller.setField("comment", "Revisión documentada");
  controller.setVerified(true);
  const invalidAge = updateReviewDraft(
    createReviewDraft(document),
    "patientAge",
    "130.5",
  );
  await controller.approve(document, invalidAge);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /edad.*entero entre 0 y 130/i);
});

test("corregir_aprobar sends only effective supported corrections and preserves drafts while invalidating verification", async () => {
  const document = syntheticDocument({
    datos_extraidos: {
      paciente: { nombre: "Paciente Sintético", edad: 30 },
      estudio_realizado: "Estudio original",
    },
  });
  const draft = createReviewDraft(document);
  const originalDocument = structuredClone(document);
  const originalDraft = structuredClone(draft);
  let confirmed = 0;
  let refreshed = 0;
  const result = syntheticDocument({ status: "APPROVED" });
  const { controller, calls } = makeDecisionHarness({
    review: async () => result,
    refresh: async () => { refreshed += 1; },
    onConfirmed: (confirmedDocument) => {
      assert.equal(confirmedDocument, result);
      confirmed += 1;
    },
  });

  setRequiredApprovalFields(controller, "EMERGENCIA_MEDICA");
  let changedDraft = updateReviewDraft(draft, "patientName", "Nombre corregido");
  changedDraft = clearAgeProposal(changedDraft);
  changedDraft = updateReviewDraft(changedDraft, "documentType", "Epicrisis");
  changedDraft = updateReviewDraft(changedDraft, "priority", "Urgente");
  changedDraft = updateReviewDraft(changedDraft, "study", "Propuesta local");
  controller.invalidateVerification();
  assert.equal(controller.getSnapshot().form.verified, false);
  assert.equal(controller.getSnapshot().form.destination, "EMERGENCIA_MEDICA");
  await controller.approve(document, changedDraft);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /verific/i);

  controller.setVerified(true);
  await controller.approve(document, changedDraft);
  assert.deepEqual(calls, [{
    documentId: document.documento_id,
    request: {
      accion: "corregir_aprobar",
      revisor: "Dra. Sintética",
      comentario: "Revisión documentada",
      destino: "EMERGENCIA_MEDICA",
      correcciones: {
        nombre_paciente: "Nombre corregido",
        edad_paciente: null,
        tipo_documento: "Epicrisis",
        nivel_prioridad: "Urgente",
      },
    },
  }]);
  assert.equal(controller.getSnapshot().phase, "confirmed");
  assert.equal(confirmed, 1);
  assert.equal(refreshed, 1);
  assertNoDraftMutation(document, draft, originalDocument, originalDraft);
  assert.equal(changedDraft.study, "Propuesta local");
});

test("approval without effective corrections uses aprobar and omits correcciones", async () => {
  const document = syntheticDocument();
  const { controller, calls } = makeDecisionHarness();
  setRequiredApprovalFields(controller, "HISTORIA_CLINICA");

  await controller.approve(document, createReviewDraft(document));

  assert.deepEqual(calls, [{
    documentId: document.documento_id,
    request: {
      accion: "aprobar",
      revisor: "Dra. Sintética",
      comentario: "Revisión documentada",
      destino: "HISTORIA_CLINICA",
    },
  }]);
});

test("rejection requires both a declared reviewer and reason before transport", async () => {
  const document = syntheticDocument();
  const { controller, calls } = makeDecisionHarness();
  controller.requestRejection();

  await controller.confirmRejection(document);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /revisor/i);

  controller.setField("reviewer", "Revisor declarado");
  await controller.confirmRejection(document);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /comentario|motivo/i);

  controller.setField("comment", "Motivo sintético");
  await controller.confirmRejection(document);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].request, {
    accion: "rechazar",
    revisor: "Revisor declarado",
    comentario: "Motivo sintético",
  });
});

test("reviewer and rejection reason respect the API length bounds without transport", async () => {
  const document = syntheticDocument();
  const { controller, calls } = makeDecisionHarness();
  controller.requestRejection();
  controller.setField("reviewer", "R".repeat(101));
  controller.setField("comment", "Motivo sintético");

  await controller.confirmRejection(document);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /hasta 100 caracteres/i);
  assert.equal(controller.getSnapshot().form.reviewer, "R".repeat(101));

  controller.setField("reviewer", "Revisor declarado");
  controller.setField("comment", "M".repeat(2001));
  await controller.confirmRejection(document);
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /hasta 2000 caracteres/i);
  assert.equal(controller.getSnapshot().form.comment, "M".repeat(2001));
});

test("rejection stays inside an explicit confirmation step; cancel sends nothing and confirm omits local corrections and destination", async () => {
  const document = syntheticDocument();
  const { controller, calls } = makeDecisionHarness();
  controller.setField("reviewer", "Revisor de rechazo");
  controller.setField("comment", "Motivo sintético");
  controller.setField("destination", "FARMACIA");
  controller.setVerified(true);

  controller.requestRejection();
  assert.equal(controller.getSnapshot().rejectionConfirmationOpen, true);
  assert.equal(calls.length, 0);
  controller.cancelRejection();
  assert.equal(controller.getSnapshot().rejectionConfirmationOpen, false);
  assert.equal(controller.getSnapshot().form.reviewer, "Revisor de rechazo");
  assert.equal(controller.getSnapshot().form.comment, "Motivo sintético");
  assert.equal(calls.length, 0);

  controller.requestRejection();
  await controller.confirmRejection(document);
  assert.deepEqual(calls, [{
    documentId: document.documento_id,
    request: {
      accion: "rechazar",
      revisor: "Revisor de rechazo",
      comentario: "Motivo sintético",
    },
  }]);
  assert.equal(controller.getSnapshot().phase, "confirmed");
  assert.equal(controller.getSnapshot().rejectionConfirmationOpen, false);
});

test("FAILED documents cannot be approved from empty data but may be rejected after confirmation", async () => {
  const failed = syntheticDocument({
    processing_status: "FAILED",
    processing_error: "SYNTHETIC_FAILURE",
    clasificacion: { nivel_prioridad: null },
    datos_extraidos: { paciente: { nombre: null } },
  });
  const { controller, calls } = makeDecisionHarness();
  controller.setField("reviewer", "Revisor declarado");
  controller.setField("comment", "Motivo técnico sin extracción");
  controller.setField("destination", "EMERGENCIA_MEDICA");
  controller.setVerified(true);

  await controller.approve(failed, createReviewDraft(failed));
  assert.equal(calls.length, 0);
  assert.match(controller.getSnapshot().error, /procesamiento|extracción/i);

  controller.requestRejection();
  await controller.confirmRejection(failed);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].request, {
    accion: "rechazar",
    revisor: "Revisor declarado",
    comentario: "Motivo técnico sin extracción",
  });
});

test("a 409 rereads the document, refreshes collections, preserves inputs, and permanently prevents resubmission", async () => {
  const document = syntheticDocument();
  const latest = syntheticDocument({ status: "APPROVED" });
  const conflict = Object.assign(new Error("La revisión ya fue resuelta"), { status: 409 });
  let reads = 0;
  let refreshes = 0;
  const { controller, calls } = makeDecisionHarness({
    review: async () => { throw conflict; },
    getDetail: async () => { reads += 1; return latest; },
    refresh: async () => { refreshes += 1; },
  });
  setRequiredApprovalFields(controller);

  await controller.approve(document, createReviewDraft(document));
  const afterConflict = controller.getSnapshot();
  assert.equal(calls.length, 1);
  assert.equal(reads, 1);
  assert.equal(refreshes, 1);
  assert.equal(afterConflict.phase, "conflict");
  assert.equal(afterConflict.latestDocument, latest);
  assert.equal(afterConflict.form.reviewer, "  Dra. Sintética  ");
  assert.equal(afterConflict.form.comment, "  Revisión documentada  ");
  assert.equal(afterConflict.form.verified, true);

  await controller.approve(document, createReviewDraft(document));
  assert.equal(calls.length, 1);
  assert.equal(reads, 1);
  assert.equal(controller.getSnapshot().phase, "conflict");
});

test("API rejection retains decision inputs; uncertain server/network failure is never submitted twice", async () => {
  const document = syntheticDocument();
  const rejection = Object.assign(new Error("Datos inválidos"), { status: 422 });
  let requestCount = 0;
  const { controller } = makeDecisionHarness({
    review: async () => {
      requestCount += 1;
      throw rejection;
    },
  });
  setRequiredApprovalFields(controller);

  await controller.approve(document, createReviewDraft(document));
  assert.equal(requestCount, 1);
  assert.equal(controller.getSnapshot().phase, "error");
  assert.equal(controller.getSnapshot().form.reviewer, "  Dra. Sintética  ");
  assert.equal(controller.getSnapshot().form.comment, "  Revisión documentada  ");
  assert.equal(controller.getSnapshot().form.destination, "HISTORIA_CLINICA");
  assert.match(controller.getSnapshot().error, /Datos inválidos/);

  const uncertainError = Object.assign(new Error("Conexión interrumpida"), { status: 500 });
  const uncertainHarness = makeDecisionHarness({
    review: async () => { throw uncertainError; },
  });
  setRequiredApprovalFields(uncertainHarness.controller);
  await uncertainHarness.controller.approve(document, createReviewDraft(document));
  assert.equal(uncertainHarness.controller.getSnapshot().phase, "uncertain");
  assert.match(uncertainHarness.controller.getSnapshot().error, /no se confirmó|confirmar/i);
  await uncertainHarness.controller.approve(document, createReviewDraft(document));
  assert.equal(uncertainHarness.calls.length, 1);
});

test("parallel decisions share one request and confirmed collection-refresh failure stays distinct", async () => {
  const document = syntheticDocument();
  const request = deferred();
  let confirmed = 0;
  const { controller, calls, refreshErrors } = makeDecisionHarness({
    review: () => request.promise,
    refresh: async () => { throw new Error("No se pudo actualizar la cola"); },
    onConfirmed: () => { confirmed += 1; },
  });
  setRequiredApprovalFields(controller);

  const first = controller.approve(document, createReviewDraft(document));
  const duplicate = controller.approve(document, createReviewDraft(document));
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(controller.getSnapshot().phase, "submitting");
  request.resolve(syntheticDocument({ status: "APPROVED" }));
  await Promise.all([first, duplicate]);

  assert.equal(controller.getSnapshot().phase, "confirmed-refresh-error");
  assert.match(controller.getSnapshot().error, /No se pudo actualizar la cola/);
  assert.equal(confirmed, 1);
  assert.deepEqual(refreshErrors, [{
    decisionConfirmed: true,
    message: "No se pudo actualizar la cola",
  }]);
  await controller.approve(document, createReviewDraft(document));
  assert.equal(calls.length, 1);
});
