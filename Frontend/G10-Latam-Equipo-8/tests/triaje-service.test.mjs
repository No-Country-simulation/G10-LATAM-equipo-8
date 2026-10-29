import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "../src/services/apiConfig.ts";
import { createTriajeService } from "../src/services/triajeServiceCore.ts";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Unprocessable Entity",
    json: async () => body,
  };
}

test("history request uses the documented paginated endpoint and query", async () => {
  const calls = [];
  const expected = { items: [], total: 3, offset: 10, limit: 5 };
  const service = createTriajeService({
    apiBaseUrl: "http://api.example/",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response(expected);
    },
  });

  const history = await service.getTriajes({
    offset: 10,
    limit: 5,
    status: "NEEDS_AUDIT",
    destino: "REVISION_HUMANA",
  });

  assert.deepEqual(history, expected);
  assert.equal(
    calls[0].url,
    "http://api.example/api/v1/triajes?offset=10&limit=5&status=NEEDS_AUDIT&destino=REVISION_HUMANA",
  );
  assert.equal(calls[0].init.method, "GET");
});

test("audit queue uses its dedicated paginated endpoint", async () => {
  const calls = [];
  const service = createTriajeService({
    apiBaseUrl: "http://api.example/api/v1/",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response({ items: [], total: 0, offset: 2, limit: 7 });
    },
  });

  await service.getAuditQueue({ offset: 2, limit: 7 });

  assert.equal(
    calls[0].url,
    "http://api.example/api/v1/audit/queue?offset=2&limit=7",
  );
  assert.equal(calls[0].init.method, "GET");
});

test("review posts the exact ReviewRequest DTO to the document route", async () => {
  const calls = [];
  const request = {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección de prueba",
    destino: "HISTORIA_CLINICA",
    correcciones: { nombre_paciente: "Paciente Corregido" },
  };
  const updated = { documento_id: "DOC-1", status: "APPROVED" };
  const service = createTriajeService({
    apiBaseUrl: "http://api.example",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response(updated);
    },
  });

  assert.deepEqual(await service.revisarDocumento("DOC-1", request), updated);
  assert.equal(calls[0].url, "http://api.example/api/v1/triajes/DOC-1/revision");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), request);
});

test("file upload uses the exact multipart contract and browser-managed boundary", async () => {
  const calls = [];
  const service = createTriajeService({
    apiBaseUrl: "http://api.example",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response({ documento_id: "DOC-1", status: "NEEDS_AUDIT" });
    },
  });
  const file = new File(["%PDF-mock"], "synthetic.pdf", {
    type: "application/pdf",
  });

  await service.subirArchivo("DOC-1", "web", file);

  assert.equal(calls[0].url, "http://api.example/api/v1/triajes/archivo");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers, undefined);
  assert.ok(calls[0].init.body instanceof FormData);
  assert.deepEqual(
    [...calls[0].init.body.keys()].sort(),
    ["archivo", "canal_origen", "documento_id"],
  );
  assert.equal(calls[0].init.body.get("documento_id"), "DOC-1");
  assert.equal(calls[0].init.body.get("canal_origen"), "web");
  assert.equal(calls[0].init.body.get("archivo").name, "synthetic.pdf");
});

test("HTTP validation errors expose backend detail instead of hiding it", async () => {
  const service = createTriajeService({
    apiBaseUrl: "http://api.example",
    fetchImpl: async () =>
      response(
        { detail: [{ loc: ["body", "revisor"], msg: "field required" }] },
        422,
      ),
  });

  await assert.rejects(
    service.revisarDocumento("DOC-1", {
      accion: "aprobar",
      revisor: "revisor-demo",
      comentario: "Revisión de prueba",
      destino: "HISTORIA_CLINICA",
    }),
    (error) => {
      assert.match(error.message, /field required/i);
      assert.equal(error.status, 422);
      assert.deepEqual(error.body, {
        detail: [{ loc: ["body", "revisor"], msg: "field required" }],
      });
      return true;
    },
  );
});

test("API base selection keeps explicit overrides and existing demo defaults", () => {
  assert.equal(resolveApiBaseUrl({ DEV: true }), "/api/v1");
  assert.equal(
    resolveApiBaseUrl({ DEV: true, VITE_API_URL: "https://api.example" }),
    "https://api.example",
  );
  assert.equal(resolveApiBaseUrl({ DEV: true, VITE_API_URL: "" }), "");
  assert.equal(resolveApiBaseUrl({ DEV: false }), "");
  assert.equal(
    resolveApiBaseUrl({ DEV: false, VITE_API_URL: "https://api.example" }),
    "https://api.example",
  );
  assert.equal(resolveApiBaseUrl({ DEV: false, VITE_API_URL: "" }), "");
});

test("relative API base preserves the prefix, query and request payloads", async () => {
  const calls = [];
  const request = {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección sintética",
    destino: "HISTORIA_CLINICA",
    correcciones: { nombre_paciente: "Paciente Corregido" },
  };
  const service = createTriajeService({
    apiBaseUrl: "/api/v1",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response({ documento_id: "DOC/1", status: "APPROVED" });
    },
  });

  await service.getTriajes({
    offset: 10,
    limit: 5,
    status: "NEEDS_AUDIT",
    destino: "REVISION_HUMANA",
  });
  await service.getAuditQueue({ offset: 2, limit: 7 });
  const file = new File(["%PDF-synthetic"], "synthetic.pdf", {
    type: "application/pdf",
  });
  await service.subirArchivo("DOC/1", "web", file);
  await service.revisarDocumento("DOC/1", request);

  assert.deepEqual(
    calls.map(({ url, init }) => [url, init.method ?? "GET"]),
    [
      [
        "/api/v1/triajes?offset=10&limit=5&status=NEEDS_AUDIT&destino=REVISION_HUMANA",
        "GET",
      ],
      ["/api/v1/audit/queue?offset=2&limit=7", "GET"],
      ["/api/v1/triajes/archivo", "POST"],
      ["/api/v1/triajes/DOC%2F1/revision", "POST"],
    ],
  );
  assert.equal(calls[2].init.headers, undefined);
  assert.ok(calls[2].init.body instanceof FormData);
  assert.deepEqual(
    [...calls[2].init.body.keys()].sort(),
    ["archivo", "canal_origen", "documento_id"],
  );
  assert.equal(calls[2].init.body.get("documento_id"), "DOC/1");
  assert.equal(calls[2].init.body.get("canal_origen"), "web");
  assert.equal(calls[2].init.body.get("archivo").name, "synthetic.pdf");
  assert.equal(calls[3].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[3].init.body), request);
});
