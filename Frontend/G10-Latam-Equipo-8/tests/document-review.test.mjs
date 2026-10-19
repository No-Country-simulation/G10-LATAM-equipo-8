import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCorrectionProposal,
  clearAgeProposal,
  createReviewDraft,
  isReviewDraftDirty,
  presentReviewDocument,
  reviewEligibility,
  updateReviewDraft,
} from "../src/components/dashboard/reviewDraft.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";

test("review draft keeps immutable originals beside separate proposed values", () => {
  const document = syntheticDocument();
  const original = structuredClone(document);
  const initialDraft = createReviewDraft(document);
  const draft = updateReviewDraft(
    initialDraft,
    "patientName",
    "Nombre propuesto",
  );
  const presentation = presentReviewDocument(document, draft);

  assert.equal(presentation.patient.name.originalValue, "Paciente Sintético");
  assert.equal(presentation.patient.name.proposedValue, "Nombre propuesto");
  assert.equal(presentation.patient.name.persistence, "correction");
  assert.deepEqual(document, original);
  assert.equal(isReviewDraftDirty(document, draft), true);
  assert.equal(isReviewDraftDirty(document, initialDraft), false);
});

test("presentation names nullable DTO groups explicitly and preserves age zero", () => {
  const document = syntheticDocument({
    datos_extraidos: {
      paciente: { nombre: null, edad: 0 },
      medico_solicitante: null,
      estudio_realizado: null,
      indicacion: null,
      diagnostico_principal: null,
      cie10_sugerido: null,
    },
    clasificacion: {
      tipo_documento: null,
      nivel_prioridad: null,
      especialidad: "Reservada",
      score_confianza_clasificacion: null,
    },
  });
  const draft = createReviewDraft(document);
  const presentation = presentReviewDocument(document, draft);

  assert.equal(draft.priority, "");
  assert.equal(presentation.patient.name.originalValue, "Sin dato");
  assert.equal(presentation.patient.age.originalValue, "0");
  assert.equal(presentation.referringDoctor.name.originalValue, "Sin dato");
  assert.equal(
    presentation.referringDoctor.registration.originalValue,
    "Sin dato",
  );
  assert.equal(presentation.study.indication.originalValue, "Sin dato");
  assert.equal(presentation.study.diagnosis.originalValue, "Sin dato");
  assert.equal(presentation.study.suggestedCIE10.originalValue, "Sin dato");
  assert.equal(presentation.classification.documentType.originalValue, "Sin dato");
  assert.equal(presentation.classification.priority.originalValue, "Sin evaluar");
  assert.equal(presentation.readOnly.specialty.value, "Reservada");
  assert.equal(presentation.readOnly.confidenceScore.value, "Sin dato");
});

test("only the four supported proposals become corrections; local-only blanks never delete", () => {
  const document = syntheticDocument({
    datos_extraidos: {
      paciente: { nombre: "Paciente Sintético", edad: 30 },
      medico_solicitante: { nombre: "Dra. Ejemplo", matricula: "MAT-1" },
      estudio_realizado: "Estudio original",
      indicacion: "Indicación original",
      diagnostico_principal: "Diagnóstico de ejemplo",
      cie10_sugerido: "A00",
    },
  });
  let draft = createReviewDraft(document);
  draft = updateReviewDraft(draft, "patientName", "");
  draft = updateReviewDraft(draft, "patientAge", "");
  draft = updateReviewDraft(draft, "documentType", "");
  draft = updateReviewDraft(draft, "priority", "");
  draft = updateReviewDraft(draft, "study", "");
  draft = updateReviewDraft(draft, "indication", "Indicación local");
  draft = updateReviewDraft(draft, "diagnosis", "");
  draft = updateReviewDraft(draft, "suggestedCIE10", "");
  draft = updateReviewDraft(draft, "referringDoctorName", "");
  draft = updateReviewDraft(draft, "referringDoctorRegistration", "");

  assert.deepEqual(buildCorrectionProposal(document, draft), {});
  assert.equal(
    presentReviewDocument(document, draft).study.indication.proposedValue,
    "Indicación local",
  );
  assert.equal(
    presentReviewDocument(document, draft).study.indication.persistence,
    "local-only",
  );

  const unchangedOriginal = structuredClone(document);
  draft = updateReviewDraft(draft, "patientName", "Nombre corregido");
  draft = updateReviewDraft(draft, "patientAge", "44");
  draft = updateReviewDraft(draft, "documentType", "Informe de Resultado");
  draft = updateReviewDraft(draft, "priority", "Urgente");
  assert.deepEqual(buildCorrectionProposal(document, draft), {
    nombre_paciente: "Nombre corregido",
    edad_paciente: 44,
    tipo_documento: "Informe de Resultado",
    nivel_prioridad: "Urgente",
  });
  assert.deepEqual(document, unchangedOriginal);
});

test("age zero remains numeric and only an explicit clear proposes null", () => {
  const document = syntheticDocument({
    datos_extraidos: {
      paciente: { nombre: "Paciente Sintético", edad: 30 },
    },
  });
  let draft = createReviewDraft(document);
  draft = updateReviewDraft(draft, "patientAge", "0");
  assert.deepEqual(buildCorrectionProposal(document, draft), {
    edad_paciente: 0,
  });

  draft = updateReviewDraft(draft, "patientAge", "");
  assert.deepEqual(buildCorrectionProposal(document, draft), {});
  draft = clearAgeProposal(draft);
  assert.deepEqual(buildCorrectionProposal(document, draft), {
    edad_paciente: null,
  });
});

test("review eligibility is read-only for terminal cases and failed extraction", () => {
  const failed = syntheticDocument({
    processing_status: "FAILED",
    processing_error: "SYNTHETIC_PROCESSING_ERROR",
    clasificacion: { nivel_prioridad: null },
  });
  const pending = syntheticDocument({ processing_status: "PROCESSING" });
  const approved = syntheticDocument({ status: "APPROVED" });

  assert.deepEqual(reviewEligibility(failed), {
    state: "failed",
    editable: false,
    heading: "Revisar procesamiento",
    priorityLabel: "Sin evaluar",
  });
  assert.equal(
    presentReviewDocument(failed, createReviewDraft(failed)).classification.priority.originalValue,
    "Sin evaluar",
  );

  const succeededWithoutPriority = syntheticDocument({
    processing_status: "SUCCEEDED",
    clasificacion: { nivel_prioridad: null },
  });
  assert.equal(reviewEligibility(succeededWithoutPriority).priorityLabel, "Sin evaluar");
  assert.equal(
    presentReviewDocument(
      succeededWithoutPriority,
      createReviewDraft(succeededWithoutPriority),
    ).classification.priority.originalValue,
    "Sin evaluar",
  );

  const routine = syntheticDocument();
  const routineDraft = createReviewDraft(routine);
  assert.equal(routineDraft.priority, "Rutina");
  assert.equal(reviewEligibility(routine).priorityLabel, "Rutinaria");
  assert.equal(
    presentReviewDocument(routine, routineDraft).classification.priority.originalValue,
    "Rutinaria",
  );
  assert.equal(
    presentReviewDocument(routine, routineDraft).classification.priority.proposedValue,
    "Rutina",
  );
  const urgentDraft = updateReviewDraft(routineDraft, "priority", "Urgente");
  assert.equal(
    presentReviewDocument(routine, urgentDraft).classification.priority.proposedValue,
    "Urgente",
  );
  assert.deepEqual(buildCorrectionProposal(routine, urgentDraft), {
    nivel_prioridad: "Urgente",
  });
  assert.equal(
    reviewEligibility(
      syntheticDocument({ clasificacion: { nivel_prioridad: "Urgente" } }),
    ).priorityLabel,
    "Urgente",
  );

  assert.equal(reviewEligibility(pending).state, "processing");
  assert.equal(reviewEligibility(pending).heading, "Procesamiento pendiente");
  assert.equal(reviewEligibility(pending).editable, false);
  assert.equal(reviewEligibility(approved).state, "readonly");
  assert.equal(reviewEligibility(approved).editable, false);
  assert.equal(reviewEligibility(syntheticDocument()).editable, true);
});
