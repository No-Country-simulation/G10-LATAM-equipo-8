import assert from "node:assert/strict";
import test from "node:test";
import {
  estadoProcesamientoLegible,
  estadoRevisionLegible,
} from "../src/hooks/documentUploadController.ts";

test("upload status presenters share readable review labels and retain processing copy", () => {
  assert.equal(estadoRevisionLegible("NEEDS_AUDIT"), "Necesita Auditoria");
  for (const [status, label] of [
    ["PROCESSED", "Procesado"],
    ["APPROVED", "Aprobado"],
    ["REJECTED", "Rechazado"],
  ]) {
    assert.equal(estadoRevisionLegible(status), label);
  }
  for (const [status, label] of [
    ["PENDING", "Pendiente"],
    ["PROCESSING", "En procesamiento"],
    ["SUCCEEDED", "Procesamiento finalizado"],
    ["FAILED", "Procesamiento fallido"],
  ]) {
    assert.equal(estadoProcesamientoLegible(status), label);
  }
});
