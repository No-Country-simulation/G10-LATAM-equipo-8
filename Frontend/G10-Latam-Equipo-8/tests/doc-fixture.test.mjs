import assert from "node:assert/strict";
import test from "node:test";
import documento from "../src/mocks/DOC-CLIN-2026-001.json" with { type: "json" };

test("recovered document sample is valid JSON in the frontend API DTO", () => {
  assert.equal(documento.documento_id, "DOC-CLIN-2026-001");
  assert.equal(documento.status, "NEEDS_AUDIT");
  assert.equal(documento.canal_origen, "demo");
  assert.match(documento.created_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(documento.clasificacion.tipo_documento, "Receta Medica");
  assert.equal(documento.clasificacion.nivel_prioridad, null);
  assert.equal(documento.decision_enrutamiento.destino_principal, "REVISION_HUMANA");
  assert.equal(documento.almacenamiento_oci, null);
  assert.equal(documento.processing_status, "SUCCEEDED");
  assert.equal("fecha_ingesta" in documento, false);
});
