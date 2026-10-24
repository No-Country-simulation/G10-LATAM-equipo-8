import assert from "node:assert/strict";
import test from "node:test";

async function loadMocks(scenario) {
  return import(`../src/mocks/triaje.ts?mock-review-${scenario}`);
}

function documentoPendiente(documentos) {
  return documentos.find((documento) => documento.status === "NEEDS_AUDIT");
}

test("correcting a nonurgent mock review to urgent activates the urgent alert", async () => {
  const mocks = await loadMocks("urgent-correction");
  const before = await mocks.mockTriajesConLatencia();
  const target = before.find(
    (documento) => documento.documento_id === "FRONTEND-REVISION-001",
  );
  assert.ok(target);
  assert.equal(target.clasificacion.nivel_prioridad, "Rutina");
  assert.equal(target.decision_enrutamiento.alerta_urgente, false);

  const reviewed = await mocks.revisionDocumento(target.documento_id, {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección sintética de prioridad urgente",
    destino: "EMERGENCIA_MEDICA",
    correcciones: { nivel_prioridad: "Urgente" },
  });

  const expected = structuredClone(target);
  expected.status = "APPROVED";
  expected.clasificacion.nivel_prioridad = "Urgente";
  expected.decision_enrutamiento.destino_principal = "EMERGENCIA_MEDICA";
  expected.decision_enrutamiento.requiere_auditoria_humana = false;
  expected.decision_enrutamiento.alerta_urgente = true;
  assert.deepEqual(reviewed, expected);

  const expectedList = structuredClone(before);
  expectedList[expectedList.findIndex((item) => item.documento_id === target.documento_id)] = expected;
  assert.deepEqual(await mocks.mockTriajesConLatencia(), expectedList);
  assert.equal((await mocks.mockHistorialConLatencia()).total, 2);
  assert.equal((await mocks.mockColaAuditoriaConLatencia()).total, 1);
});

test("mock review preserves an existing urgent alert after correction to nonurgent", async () => {
  const mocks = await loadMocks("preserve-urgent-alert");
  const targetId = "FRONTEND-REVISION-001";
  const seed = mocks.mockTriajes.find((documento) => documento.documento_id === targetId);
  if (seed) {
    seed.clasificacion.nivel_prioridad = "Urgente";
    seed.decision_enrutamiento.alerta_urgente = true;
  }
  const before = await mocks.mockTriajesConLatencia();
  const target = before.find((documento) => documento.documento_id === targetId);
  assert.ok(target);
  assert.equal(target.clasificacion.nivel_prioridad, "Urgente");
  assert.equal(target.decision_enrutamiento.alerta_urgente, true);

  const reviewed = await mocks.revisionDocumento(target.documento_id, {
    accion: "corregir_aprobar",
    revisor: "revisor-demo",
    comentario: "Corrección sintética a prioridad de rutina",
    destino: "HISTORIA_CLINICA",
    correcciones: { nivel_prioridad: "Rutina" },
  });

  const expected = structuredClone(target);
  expected.status = "APPROVED";
  expected.clasificacion.nivel_prioridad = "Rutina";
  expected.decision_enrutamiento.destino_principal = "HISTORIA_CLINICA";
  expected.decision_enrutamiento.requiere_auditoria_humana = false;
  assert.deepEqual(reviewed, expected);
  const expectedList = structuredClone(before);
  expectedList[expectedList.findIndex((item) => item.documento_id === target.documento_id)] = expected;
  assert.deepEqual(await mocks.mockTriajesConLatencia(), expectedList);
});

test("mock review persists nonurgent correction approval without changing provider data", async () => {
  const mocks = await loadMocks("nonurgent-correction");
  const before = await mocks.mockTriajesConLatencia();
  const target = documentoPendiente(before);
  assert.ok(target, "fixture has a pending review case");

  const reviewed = await mocks.revisionDocumento(target.documento_id, {
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

  const expected = structuredClone(target);
  expected.status = "APPROVED";
  expected.datos_extraidos.paciente.nombre = "Paciente Corregido";
  expected.clasificacion.tipo_documento = "Informe de Laboratorio";
  expected.decision_enrutamiento.destino_principal = "HISTORIA_CLINICA";
  expected.decision_enrutamiento.requiere_auditoria_humana = false;
  assert.deepEqual(reviewed, expected);

  const expectedList = structuredClone(before);
  expectedList[expectedList.findIndex((item) => item.documento_id === target.documento_id)] = expected;
  assert.deepEqual(await mocks.mockTriajesConLatencia(), expectedList);
  assert.equal(reviewed.almacenamiento.proveedor, target.almacenamiento.proveedor);
  assert.equal(reviewed.almacenamiento_oci, null);
});

test("rejection preserves the destination and persists only the terminal decision", async () => {
  const mocks = await loadMocks("reject");
  const before = await mocks.mockTriajesConLatencia();
  const target = documentoPendiente(before);
  assert.ok(target, "fixture has a pending review case");

  const rejected = await mocks.revisionDocumento(target.documento_id, {
    accion: "rechazar",
    revisor: "revisor-demo",
    comentario: "Rechazo sintético de prueba",
  });

  const expected = structuredClone(target);
  expected.status = "REJECTED";
  expected.decision_enrutamiento.requiere_auditoria_humana = false;
  assert.deepEqual(rejected, expected);
  const expectedList = structuredClone(before);
  expectedList[expectedList.findIndex((item) => item.documento_id === target.documento_id)] = expected;
  assert.deepEqual(await mocks.mockTriajesConLatencia(), expectedList);
});

test("rejected review input leaves the public mock list and counts unchanged", async () => {
  const mocks = await loadMocks("invalid-input");
  const before = await mocks.mockTriajesConLatencia();
  const beforeHistory = await mocks.mockHistorialConLatencia();
  const beforeQueue = await mocks.mockColaAuditoriaConLatencia();
  const target = documentoPendiente(before);
  assert.ok(target, "fixture has a pending review case");

  await assert.rejects(
    mocks.revisionDocumento(target.documento_id, {
      accion: "aprobar",
      revisor: "   ",
      comentario: "Aprobación sintética de prueba",
      destino: "HISTORIA_CLINICA",
    }),
    { message: "El revisor es obligatorio y admite hasta 100 caracteres" },
  );

  assert.deepEqual(await mocks.mockTriajesConLatencia(), before);
  assert.deepEqual(await mocks.mockHistorialConLatencia(), beforeHistory);
  assert.deepEqual(await mocks.mockColaAuditoriaConLatencia(), beforeQueue);
});

test("mock rejects review for a non-auditable status without mutating public state", async () => {
  const mocks = await loadMocks("non-auditable");
  const before = await mocks.mockTriajesConLatencia();
  const target = before.find((item) => item.status === "PROCESSED");
  assert.ok(target, "fixture has a non-auditable case");

  await assert.rejects(
    mocks.revisionDocumento(target.documento_id, {
      accion: "aprobar",
      revisor: "revisor-demo",
      comentario: "Aprobación sintética de prueba",
      destino: "HISTORIA_CLINICA",
    }),
    { message: "El documento ya está resuelto" },
  );
  assert.deepEqual(await mocks.mockTriajesConLatencia(), before);
});
