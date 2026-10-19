import { useId } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import {
  presentReviewDocument,
  reviewEligibility,
  type ReadOnlyFieldPresentation,
  type ReviewDraft,
  type ReviewDraftTextField,
  type ReviewFieldPresentation,
} from "./reviewDraft";
import type { TriajeDocumento } from "../../types/triaje";

interface ReviewDocumentFieldsProps {
  document: TriajeDocumento;
  draft: ReviewDraft;
  onDraftChange: (field: ReviewDraftTextField, value: string) => void;
  onAgeClear: () => void;
}

function MetadataList({
  title,
  fields,
}: {
  title: string;
  fields: ReadOnlyFieldPresentation[];
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0 space-y-1">
            <dt className="text-xs font-medium text-slate-600">{field.label}</dt>
            <dd className="break-words text-sm text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReviewField({
  field,
  id,
  editable,
  onChange,
  ageExplicitlyCleared = false,
  onAgeClear,
}: {
  field: ReviewFieldPresentation;
  id: string;
  editable: boolean;
  onChange: (field: ReviewDraftTextField, value: string) => void;
  ageExplicitlyCleared?: boolean;
  onAgeClear?: () => void;
}) {
  const noteId = `${id}-local-note`;
  const localOnly = field.persistence === "local-only";

  if (!editable) {
    return (
      <div className="space-y-1 border-b border-slate-200 py-3 last:border-b-0">
        <p className="text-sm font-medium text-slate-800">{field.label}</p>
        <p className="text-xs text-slate-600">Valor original</p>
        <p className="break-words text-sm text-slate-900">{field.originalValue}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-slate-200 py-4 last:border-b-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">{field.label}</p>
        <p className="text-xs text-slate-600">Valor recibido</p>
        <p className="break-words text-sm text-slate-900">{field.originalValue}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-slate-800">
          Propuesta del revisor · {field.label}
        </label>
        {field.key === "priority" ? (
          <NativeSelect
            id={id}
            value={field.proposedValue}
            aria-describedby={localOnly ? noteId : undefined}
            onChange={(event) => onChange(field.key, event.currentTarget.value)}
          >
            <option value="">Sin evaluar</option>
            <option value="Rutina">Rutinaria</option>
            <option value="Urgente">Urgente</option>
          </NativeSelect>
        ) : field.key === "study" ||
          field.key === "indication" ||
          field.key === "diagnosis" ||
          field.key === "suggestedCIE10" ? (
          <Textarea
            id={id}
            value={field.proposedValue}
            aria-describedby={localOnly ? noteId : undefined}
            onChange={(event) => onChange(field.key, event.currentTarget.value)}
          />
        ) : (
          <Input
            id={id}
            type={field.key === "patientAge" ? "number" : "text"}
            min={field.key === "patientAge" ? 0 : undefined}
            max={field.key === "patientAge" ? 130 : undefined}
            step={field.key === "patientAge" ? 1 : undefined}
            value={field.proposedValue}
            aria-describedby={localOnly ? noteId : undefined}
            onChange={(event) => onChange(field.key, event.currentTarget.value)}
          />
        )}
        {localOnly ? (
          <p id={noteId} className="text-xs text-slate-600">
            Solo local · no se envía al servidor.
          </p>
        ) : null}
        {field.key === "patientAge" && field.originalValue !== "Sin dato" ? (
          <div className="space-y-1">
            <Button
              type="button"
              variant="link"
              className="h-auto min-h-11 px-0 text-left"
              onClick={onAgeClear}
            >
              Proponer edad como Sin dato
            </Button>
            {ageExplicitlyCleared ? (
              <p role="status" className="text-xs text-slate-600">
                Se propone un valor nulo explícito; todavía no se envía.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewDocumentFields({
  document,
  draft,
  onDraftChange,
  onAgeClear,
}: ReviewDocumentFieldsProps) {
  const idPrefix = useId();
  const presentation = presentReviewDocument(document, draft);
  const eligibility = reviewEligibility(document);
  const editable = eligibility.editable;
  const fieldId = (field: ReviewDraftTextField) => `${idPrefix}-${field}`;

  const renderField = (field: ReviewFieldPresentation) => (
    <ReviewField
      key={field.key}
      field={field}
      id={fieldId(field.key)}
      editable={editable}
      onChange={onDraftChange}
      ageExplicitlyCleared={draft.ageExplicitlyCleared}
      onAgeClear={onAgeClear}
    />
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Datos extraídos</h2>
        <p className="text-sm text-slate-600">
          El valor recibido permanece visible junto a una propuesta separada.
        </p>
      </header>

      {eligibility.state === "failed" ? (
        <section
          role="alert"
          className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <h3 className="font-semibold">Revisar procesamiento</h3>
          <p>
            No hay una extracción verificable para editar. Los datos clínicos se
            muestran en solo lectura y no se presenta un formulario de aprobación.
          </p>
          <p>Prioridad clínica: {eligibility.priorityLabel}</p>
          <details className="pt-1">
            <summary className="min-h-11 cursor-pointer font-medium">
              Diagnóstico técnico
            </summary>
            <p className="break-words pt-2">
              {presentation.processingError ?? "Sin dato"}
            </p>
          </details>
        </section>
      ) : eligibility.state === "processing" ? (
        <section
          role="status"
          className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
        >
          <h3 className="font-semibold">Procesamiento pendiente</h3>
          <p>
            El resultado técnico todavía no está disponible. Los campos se muestran
            en solo lectura mientras se completa el procesamiento.
          </p>
        </section>
      ) : eligibility.state === "readonly" ? (
        <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          Este documento no admite edición en su estado actual.
        </p>
      ) : null}

      {editable ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          Las propuestas de esta vista no se guardan ni se envían al servidor.
        </p>
      ) : null}

      <section aria-labelledby={`${idPrefix}-patient-heading`} className="space-y-3">
        <h3
          id={`${idPrefix}-patient-heading`}
          className="text-base font-semibold text-teal-800"
        >
          Datos del paciente
        </h3>
        <div className="divide-y divide-slate-200">
          {renderField(presentation.patient.name)}
          {renderField(presentation.patient.age)}
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-doctor-heading`} className="space-y-3">
        <h3
          id={`${idPrefix}-doctor-heading`}
          className="text-base font-semibold text-teal-800"
        >
          Médico referente
        </h3>
        <div className="divide-y divide-slate-200">
          {renderField(presentation.referringDoctor.name)}
          {renderField(presentation.referringDoctor.registration)}
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-study-heading`} className="space-y-3">
        <h3
          id={`${idPrefix}-study-heading`}
          className="text-base font-semibold text-teal-800"
        >
          Datos del estudio
        </h3>
        <div className="divide-y divide-slate-200">
          {renderField(presentation.study.performed)}
          {renderField(presentation.study.indication)}
          {renderField(presentation.study.diagnosis)}
          {renderField(presentation.study.suggestedCIE10)}
        </div>
      </section>

      <section
        aria-labelledby={`${idPrefix}-classification-heading`}
        className="space-y-3"
      >
        <h3
          id={`${idPrefix}-classification-heading`}
          className="text-base font-semibold text-teal-800"
        >
          Clasificación
        </h3>
        <div className="divide-y divide-slate-200">
          {renderField(presentation.classification.documentType)}
          {renderField(presentation.classification.priority)}
          {!editable ? (
            <div className="space-y-1 border-b border-slate-200 py-3 last:border-b-0">
              <p className="text-sm font-medium text-slate-800">
                Especialidad (reservada)
              </p>
              <p className="text-xs text-slate-600">Solo lectura</p>
              <p className="text-sm text-slate-900">
                {presentation.readOnly.specialty.value}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {editable ? (
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-base font-semibold text-slate-900">
            Metadatos de solo lectura
          </h3>
          <p className="text-sm text-slate-600">
            Los identificadores, estados, auditoría, almacenamiento y procedencia
            no son campos de corrección.
          </p>
          <details className="rounded-lg border border-slate-200 px-4">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-slate-800">
              Ver metadatos técnicos
            </summary>
            <div className="space-y-6 pb-4">
              <MetadataList title="Identificación" fields={presentation.readOnly.system} />
              <MetadataList title="Procesamiento" fields={presentation.readOnly.processing} />
              <MetadataList title="Enrutamiento registrado" fields={presentation.readOnly.routing} />
              <MetadataList title="Almacenamiento" fields={presentation.readOnly.storage} />
              <MetadataList
                title="Confianza declarada"
                fields={[presentation.readOnly.confidenceScore]}
              />
              <MetadataList
                title="Procedencia de extracción"
                fields={presentation.readOnly.provenance}
              />
              <MetadataList
                title="Clasificación reservada"
                fields={[presentation.readOnly.specialty]}
              />
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">
                  Evidencia de extracción recibida
                </h4>
                {presentation.readOnly.extractionEvidence.length === 0 ? (
                  <p className="text-sm text-slate-600">Sin dato</p>
                ) : (
                  <ul className="space-y-3">
                    {presentation.readOnly.extractionEvidence.map((evidence, index) => (
                      <li
                        key={`${evidence.field}-${index}`}
                        className="space-y-1 border-b border-slate-200 pb-3 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          Campo: {evidence.field}
                        </p>
                        <p className="text-xs text-slate-600">
                          Página informada: {evidence.page}
                        </p>
                        <p className="break-words text-sm text-slate-900">
                          Cita recibida: {evidence.quote}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </details>
        </div>
      ) : (
        <details className="space-y-3 border-t border-slate-200 pt-4">
          <summary className="min-h-11 cursor-pointer text-base font-semibold text-slate-900">
            Metadatos de solo lectura
          </summary>
          <div className="space-y-6 pb-4">
            <MetadataList title="Identificación" fields={presentation.readOnly.system} />
            <MetadataList title="Procesamiento" fields={presentation.readOnly.processing} />
            <MetadataList title="Enrutamiento registrado" fields={presentation.readOnly.routing} />
            <MetadataList title="Almacenamiento" fields={presentation.readOnly.storage} />
            <MetadataList
              title="Confianza declarada"
              fields={[presentation.readOnly.confidenceScore]}
            />
            <MetadataList title="Procedencia de extracción" fields={presentation.readOnly.provenance} />
            <MetadataList
              title="Clasificación reservada"
              fields={[presentation.readOnly.specialty]}
            />
            {presentation.readOnly.extractionEvidence.map((evidence, index) => (
              <section
                key={`${evidence.field}-${index}`}
                className="space-y-1 border-b border-slate-200 pb-3 last:border-b-0"
              >
                <h4 className="text-sm font-semibold text-slate-800">
                  Evidencia recibida · {evidence.field}
                </h4>
                <p className="text-xs text-slate-600">
                  Página informada: {evidence.page}
                </p>
                <p className="break-words text-sm text-slate-900">
                  Cita recibida: {evidence.quote}
                </p>
              </section>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
