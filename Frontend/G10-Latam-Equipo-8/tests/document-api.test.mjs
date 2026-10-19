import assert from "node:assert/strict";
import test from "node:test";
import { createTriajeService } from "../src/services/triajeServiceCore.ts";

function jsonResponse(body, status = 200, statusText = "OK") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

function demoService(mock) {
  return createTriajeService({ apiBaseUrl: "", mock });
}

test("document detail uses the encoded public document ID route", async () => {
  const calls = [];
  const detail = { documento_id: "DOC/1", status: "NEEDS_AUDIT" };
  const service = createTriajeService({
    apiBaseUrl: "https://api.example/api/v1/",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(detail);
    },
  });

  assert.deepEqual(await service.getDetalleTriaje("DOC/1"), detail);
  assert.deepEqual(calls.map(({ url, init }) => [url, init.method ?? "GET"]), [
    ["https://api.example/api/v1/triajes/DOC%2F1", "GET"],
  ]);
});

test("original endpoint returns original bytes, response MIME and optional filename", async () => {
  const calls = [];
  const originalBytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
  const responses = [
    new Response(originalBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="synthetic-original.pdf"',
      },
    }),
    new Response(new Uint8Array([0, 1, 2]), {
      headers: { "Content-Type": "image/png" },
    }),
  ];
  const service = createTriajeService({
    apiBaseUrl: "https://api.example",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return responses.shift();
    },
  });

  const original = await service.getDocumentoOriginal("DOC/1");
  assert.ok(original.blob instanceof Blob);
  assert.deepEqual(
    [...new Uint8Array(await original.blob.arrayBuffer())],
    [...originalBytes],
  );
  assert.equal(original.contentType, "application/pdf");
  assert.equal(original.filename, "synthetic-original.pdf");

  const withoutFilename = await service.getDocumentoOriginal("DOC-2");
  assert.equal(withoutFilename.contentType, "image/png");
  assert.equal(Object.hasOwn(withoutFilename, "filename"), false);
  assert.deepEqual(calls.map(({ url, init }) => [url, init.method ?? "GET"]), [
    ["https://api.example/api/v1/triajes/DOC%2F1/documento", "GET"],
    ["https://api.example/api/v1/triajes/DOC-2/documento", "GET"],
  ]);
});

test("review events use the public route and return the backend array unchanged", async () => {
  const calls = [];
  const events = [
    {
      review_id: "review-1",
      document_id: "DOC/1",
      action: "aprobar",
      reviewer: "revisor-demo",
      comment: "Revisión sintética",
    },
  ];
  const service = createTriajeService({
    apiBaseUrl: "/api/v1/",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(events);
    },
  });

  assert.deepEqual(await service.getRevisiones("DOC/1"), events);
  assert.equal(calls[0].url, "/api/v1/triajes/DOC%2F1/revisiones");
  assert.equal(calls[0].init.method ?? "GET", "GET");
});

test("HTTP failures preserve structured status and response body without mock fallback", async () => {
  let mockReads = 0;
  const body = { detail: "La revisión ya fue procesada" };
  const service = createTriajeService({
    apiBaseUrl: "https://api.example",
    fetchImpl: async () => jsonResponse(body, 409, "Conflict"),
    mock: {
      getHistory: async () => {
        mockReads += 1;
        return { items: [], total: 0, offset: 0, limit: 20 };
      },
      getAuditQueue: async () => ({ items: [], total: 0, offset: 0, limit: 20 }),
      review: async () => ({}),
    },
  });

  await assert.rejects(service.getDetalleTriaje("DOC-1"), (error) => {
    assert.equal(error.status, 409);
    assert.equal(error.statusText, "Conflict");
    assert.deepEqual(error.body, body);
    assert.equal(error.detail, body.detail);
    assert.equal(error.message, body.detail);
    return true;
  });
  assert.equal(mockReads, 0);
});

test("explicit empty API URL reports demo provenance and dispatches only to demo reads", async () => {
  const detail = { documento_id: "FRONTEND-REVISION-001" };
  const calls = [];
  const service = demoService({
    getHistory: async () => ({ items: [], total: 0, offset: 0, limit: 20 }),
    getAuditQueue: async () => ({ items: [], total: 0, offset: 0, limit: 20 }),
    review: async () => detail,
    getDocument: async (id) => {
      calls.push(id);
      return detail;
    },
  });

  assert.equal(service.provenance, "demo");
  assert.deepEqual(await service.getDetalleTriaje(detail.documento_id), detail);
  assert.deepEqual(calls, [detail.documento_id]);
});

test("demo reads use the portable two-record dataset and report no false original or events", async () => {
  const mocks = await import("../src/mocks/triaje.ts");
  const service = demoService({
    getHistory: mocks.mockHistorialConLatencia,
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      mocks.mockColaAuditoriaConLatencia(offset, limit),
    review: mocks.revisionDocumento,
    getDocument: mocks.mockDetalleTriajeConLatencia,
    getOriginal: mocks.mockDocumentoOriginalConLatencia,
    getReviewEvents: mocks.mockRevisionesConLatencia,
  });

  assert.equal(service.provenance, "demo");
  const history = await service.getTriajes();
  const queue = await service.getAuditQueue();
  assert.equal(history.total, 2);
  assert.equal(queue.total, 2);
  assert.deepEqual(
    history.items.map(({ documento_id }) => documento_id),
    ["FRONTEND-REVISION-001", "FRONTEND-FALLO-001"],
  );
  assert.equal(
    history.items.filter((item) => item.decision_enrutamiento.alerta_urgente).length,
    0,
  );

  const known = await service.getDetalleTriaje("FRONTEND-REVISION-001");
  assert.equal(known.datos_extraidos.paciente.nombre, "Demo Sintético");
  assert.equal(known.datos_extraidos.paciente.edad, 30);
  assert.equal(known.processing_status, "SUCCEEDED");
  assert.deepEqual(known.audit_reasons, [
    "UNVERIFIED_BINARY_EVIDENCE",
    "GEMINI_REQUIRES_HUMAN_REVIEW",
  ]);

  const failed = await service.getDetalleTriaje("FRONTEND-FALLO-001");
  assert.equal(failed.processing_status, "FAILED");
  assert.equal(failed.processing_error, "GEMINI_TIMEOUT");
  assert.equal(failed.datos_extraidos.paciente.nombre, null);
  assert.deepEqual(failed.extraction_evidence, []);
  assert.deepEqual(await service.getRevisiones("FRONTEND-FALLO-001"), []);
  await assert.rejects(
    service.getDocumentoOriginal("FRONTEND-REVISION-001"),
    /no está disponible en modo demo/i,
  );
});

test("demo review mutations are verified through public history, queue and detail reads", async () => {
  const mocks = await import("../src/mocks/triaje.ts");
  const service = demoService({
    getHistory: mocks.mockHistorialConLatencia,
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      mocks.mockColaAuditoriaConLatencia(offset, limit),
    review: mocks.revisionDocumento,
    getDocument: mocks.mockDetalleTriajeConLatencia,
    getOriginal: mocks.mockDocumentoOriginalConLatencia,
    getReviewEvents: mocks.mockRevisionesConLatencia,
  });
  const before = await service.getTriajes();
  const id = "FRONTEND-REVISION-001";
  assert.equal(before.items.find((item) => item.documento_id === id)?.status, "NEEDS_AUDIT");

  await service.revisarDocumento(id, {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección sintética de prueba",
    destino: "HISTORIA_CLINICA",
    correcciones: { nombre_paciente: "Paciente Corregido" },
  });

  const after = await service.getTriajes();
  const queue = await service.getAuditQueue();
  const detail = await service.getDetalleTriaje(id);
  assert.equal(after.items.find((item) => item.documento_id === id)?.status, "APPROVED");
  assert.equal(after.total, 2);
  assert.equal(queue.total, 1);
  assert.equal(detail.datos_extraidos.paciente.nombre, "Paciente Corregido");
});
