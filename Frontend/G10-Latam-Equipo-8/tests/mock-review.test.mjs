import assert from "node:assert/strict";
import test from "node:test";
import {
  mockTriajesConLatencia,
  revisionDocumento,
} from "../src/mocks/triaje.ts";

function esPendiente(documento) {
  return (
    documento.status === "NEEDS_AUDIT" ||
    documento.status === "pendiente_revision"
  );
}

function solicitudAprobar(overrides = {}) {
  return {
    accion: "aprobar",
    revisor: "revisor-demo",
    comentario: "Aprobación sintética de prueba",
    destino: "HISTORIA_CLINICA",
    ...overrides,
  };
}

test("mock review persists correction approval and updates the recovered DTO", async () => {
  const before = await mockTriajesConLatencia();
  const target = before.find(esPendiente);
  assert.ok(target, "fixture has a pending review case");

  const reviewed = await revisionDocumento(target.documento_id, {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección sintética de prueba",
    destino: "HISTORIA_CLINICA",
    correcciones: {
      nombre_paciente: "Paciente Corregido",
      tipo_documento: "Informe de Laboratorio",
      nivel_prioridad: "Rutina",
    },
  });

  assert.equal(reviewed.status, "APPROVED");
  assert.equal(reviewed.datos_extraidos.paciente.nombre, "Paciente Corregido");
  assert.equal(reviewed.clasificacion.tipo_documento, "Informe de Laboratorio");
  assert.equal(reviewed.decision_enrutamiento.destino_principal, "HISTORIA_CLINICA");
  const persisted = await mockTriajesConLatencia();
  assert.equal(
    persisted.find((item) => item.documento_id === target.documento_id)?.status,
    "APPROVED",
  );
});

test("rejected review input leaves the public mock list unchanged", async () => {
  const before = await mockTriajesConLatencia();
  const target = before.find(esPendiente);
  assert.ok(target, "fixture has a pending review case");
  const snapshot = structuredClone(target);

  await assert.rejects(
    revisionDocumento(
      target.documento_id,
      solicitudAprobar({ revisor: "   " }),
    ),
  );

  const after = await mockTriajesConLatencia();
  assert.deepEqual(
    after.find((item) => item.documento_id === target.documento_id),
    snapshot,
  );
});

test("rejection persists a terminal status without inventing a destination", async () => {
  const before = await mockTriajesConLatencia();
  const target = before.find(esPendiente);
  assert.ok(target, "fixture has a pending review case");

  const rejected = await revisionDocumento(target.documento_id, {
    accion: "rechazar",
    revisor: "revisor-demo",
    comentario: "Rechazo sintético de prueba",
  });

  assert.equal(rejected.status, "REJECTED");
  assert.equal(
    rejected.decision_enrutamiento.destino_principal,
    target.decision_enrutamiento.destino_principal,
  );
  assert.equal(rejected.decision_enrutamiento.requiere_auditoria_humana, false);
  const persisted = await mockTriajesConLatencia();
  assert.equal(
    persisted.find((item) => item.documento_id === target.documento_id)?.status,
    "REJECTED",
  );
});

test("mock rejects review for a non-auditable status", async () => {
  const cases = await mockTriajesConLatencia();
  const target = cases.find(
    (item) => item.status === "PROCESSED" || item.status === "procesado",
  );
  assert.ok(target, "fixture has a non-auditable case");

  await assert.rejects(
    revisionDocumento(target.documento_id, solicitudAprobar()),
  );
});
