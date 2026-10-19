import assert from "node:assert/strict";
import test from "node:test";
import { crearSolicitudRevision } from "../src/components/dashboard/crearSolicitudRevision.ts";

const documento = {
  documento_id: "TEST-REVIEW-001",
  status: "NEEDS_AUDIT",
  processing_status: "SUCCEEDED",
  clasificacion: {
    tipo_documento: "Informe de Laboratorio",
    nivel_prioridad: "Rutina",
  },
  datos_extraidos: { paciente: { nombre: "Paciente Demo", edad: 30 } },
};

function campos(overrides = {}) {
  return {
    revisor: "  revisor-demo  ",
    comentario: "  Revisión de prueba  ",
    destino: "HISTORIA_CLINICA",
    nombrePaciente: "",
    edadPaciente: "",
    borrarEdad: false,
    tipoDocumento: "",
    nivelPrioridad: "",
    ...overrides,
  };
}

test("approval request trims text and matches the backend DTO", () => {
  assert.deepEqual(
    crearSolicitudRevision("aprobar", campos(), documento),
    {
      accion: "aprobar",
      revisor: "revisor-demo",
      comentario: "Revisión de prueba",
      destino: "HISTORIA_CLINICA",
    },
  );
});

test("correction approval sends only effective snake_case corrections and can clear age", () => {
  assert.deepEqual(
    crearSolicitudRevision(
      "corregir_aprobar",
      campos({ nombrePaciente: "Paciente Corregido", borrarEdad: true }),
      documento,
    ),
    {
      accion: "corregir_aprobar",
      revisor: "revisor-demo",
      comentario: "Revisión de prueba",
      destino: "HISTORIA_CLINICA",
      correcciones: {
        nombre_paciente: "Paciente Corregido",
        edad_paciente: null,
      },
    },
  );
});

test("correction approval rejects an empty or unchanged correction", () => {
  assert.throws(
    () =>
      crearSolicitudRevision(
        "corregir_aprobar",
        campos({ nombrePaciente: "Paciente Demo" }),
        documento,
      ),
    /cambio efectivo/i,
  );
});

test("approval rejects missing final destination and invalid urgent routing", () => {
  assert.throws(
    () => crearSolicitudRevision("aprobar", campos({ destino: "" }), documento),
    /destino/i,
  );
  assert.throws(
    () =>
      crearSolicitudRevision(
        "aprobar",
        campos({ destino: "HISTORIA_CLINICA" }),
        {
          ...documento,
          clasificacion: { ...documento.clasificacion, nivel_prioridad: "Urgente" },
        },
      ),
    /EMERGENCIA_MEDICA/i,
  );
});

test("rejection omits destination and corrections from the request", () => {
  assert.deepEqual(
    crearSolicitudRevision("rechazar", campos({ destino: "" }), documento),
    {
      accion: "rechazar",
      revisor: "revisor-demo",
      comentario: "Revisión de prueba",
    },
  );
});

test("reviewer and comment are mandatory and bounded by the API contract", () => {
  assert.throws(
    () => crearSolicitudRevision("aprobar", campos({ revisor: "   " }), documento),
    /revisor/i,
  );
  assert.throws(
    () => crearSolicitudRevision("aprobar", campos({ comentario: "   " }), documento),
    /comentario/i,
  );
  assert.throws(
    () => crearSolicitudRevision("aprobar", campos({ revisor: "x".repeat(101) }), documento),
    /revisor/i,
  );
  assert.throws(
    () => crearSolicitudRevision("aprobar", campos({ comentario: "x".repeat(2001) }), documento),
    /comentario/i,
  );
});
