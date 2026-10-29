import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createReviewDraft } from "../src/components/dashboard/reviewDraft.ts";
import { syntheticDocument } from "./helpers/document-review-fixture.mjs";
import { createReviewFieldsRenderer } from "./helpers/review-editing-renderer.mjs";

let renderFields;
let closeRenderer;

before(async () => {
  const renderer = await createReviewFieldsRenderer();
  renderFields = renderer.render;
  closeRenderer = renderer.close;
});

after(async () => {
  await closeRenderer?.();
});

function fieldsProps(document, editingEnabled = false) {
  return {
    document,
    draft: createReviewDraft(document),
    editingEnabled,
    onDraftChange() {},
    onAgeClear() {},
    onEnableEditing() {},
  };
}

function renderedControls(markup) {
  return [...markup.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].map(
    ([, tag, attributes]) => ({
      tag,
      field: attributes.match(/\bdata-review-edit-control="([^"]+)"/)?.[1],
      id: attributes.match(/\bid="([^"]+)"/)?.[1],
    }),
  );
}

function assertControlsAreAssociatedWithLabels(markup, controls) {
  for (const control of controls) {
    assert.ok(control.id, `${control.field} has a stable accessible control ID`);
    assert.ok(
      markup.includes(`for="${control.id}"`),
      `${control.field} has a label associated with its control`,
    );
  }
}

const expectedControls = {
  patientName: "input",
  patientAge: "input",
  referringDoctorName: "input",
  referringDoctorRegistration: "input",
  study: "textarea",
  indication: "textarea",
  diagnosis: "textarea",
  suggestedCIE10: "textarea",
  documentType: "input",
  priority: "select",
};

const editModeButton = /<button\b(?=[^>]*type="button")(?=[^>]*data-review-edit-mode-button="true")[^>]*>Modificar datos<\/button>/;

test("eligible extracted fields render read-only by default with an explicit edit action", async () => {
  const document = syntheticDocument();
  const props = fieldsProps(document);
  const draftBeforeRender = structuredClone(props.draft);
  const markup = await renderFields(props);

  assert.equal(renderedControls(markup).length, 0);
  assert.match(markup, /data-review-edit-mode="read-only"/);
  assert.match(markup, editModeButton);
  assert.match(markup, /Valor original/);
  assert.doesNotMatch(markup, /Proponer edad como Sin dato/);
  assert.deepEqual(props.draft, draftBeforeRender);
});

test("busy review keeps the explicit modification action disabled", async () => {
  const props = fieldsProps(syntheticDocument());
  props.editingDisabled = true;
  const markup = await renderFields(props);
  const button = markup.match(
    /<button\b(?=[^>]*data-review-edit-mode-button="true")[^>]*>/,
  )?.[0] ?? "";
  const attributeNames = [...button.matchAll(
    /\s([a-z][a-z\d-]*)(?:="[^"]*")?/gi,
  )].map(([, name]) => name);

  assert.equal(renderedControls(markup).length, 0);
  assert.ok(
    attributeNames.includes("disabled"),
    "the modification action must have a native disabled attribute while busy",
  );
});

test("explicit edit mode renders every labeled document control and no edit action", async () => {
  const document = syntheticDocument();
  const markup = await renderFields(fieldsProps(document, true));
  const controls = renderedControls(markup);

  assert.match(markup, /data-review-edit-mode="editing"/);
  assert.doesNotMatch(markup, editModeButton);
  assert.deepEqual(
    controls.map(({ field, tag }) => [field, tag]).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    Object.entries(expectedControls).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  assertControlsAreAssociatedWithLabels(markup, controls);
  assert.match(markup, /Proponer edad como Sin dato/);
});

test("existing ineligible documents stay read-only even when edit mode is requested", async () => {
  const ineligibleDocuments = [
    syntheticDocument({ status: "APPROVED" }),
    syntheticDocument({ status: "REJECTED" }),
    syntheticDocument({ processing_status: "FAILED" }),
    syntheticDocument({ processing_status: "PENDING" }),
    syntheticDocument({ processing_status: "PROCESSING" }),
    syntheticDocument({ status: "PENDING" }),
  ];

  for (const document of ineligibleDocuments) {
    const markup = await renderFields(fieldsProps(document, true));

    assert.equal(renderedControls(markup).length, 0);
    assert.doesNotMatch(markup, editModeButton);
    assert.match(markup, /data-review-edit-mode="ineligible"/);
  }
});
