import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import type {
  FinalReviewDestination,
  ReviewDecisionField,
  ReviewDecisionSnapshot,
} from "../../hooks/documentReviewDecisionController";

interface ReviewDecisionFieldsProps {
  snapshot: ReviewDecisionSnapshot;
  busy: boolean;
  canApprove: boolean;
  canReject: boolean;
  hasEffectiveCorrections: boolean;
  onFieldChange: (field: ReviewDecisionField, value: string) => void;
  onVerificationChange: (verified: boolean) => void;
  onRequestRejection: () => void;
  onCancelRejection: () => void;
  onConfirmRejection: () => void;
  onApprove: () => void;
}

const finalDestinations: Array<{
  value: FinalReviewDestination;
  label: string;
}> = [
  { value: "HISTORIA_CLINICA", label: "Historia clínica" },
  { value: "EMERGENCIA_MEDICA", label: "Emergencia médica" },
  { value: "FARMACIA", label: "Farmacia" },
  { value: "AUDITORIA_AUTORIZACIONES", label: "Auditoría de autorizaciones" },
];

function decisionIsLocked(phase: ReviewDecisionSnapshot["phase"]): boolean {
  return (
    phase === "submitting" ||
    phase === "reloading-conflict" ||
    phase === "conflict" ||
    phase === "uncertain" ||
    phase === "confirmed" ||
    phase === "confirmed-refresh-error"
  );
}

export function ReviewDecisionFields({
  snapshot,
  busy,
  canApprove,
  canReject,
  hasEffectiveCorrections,
  onFieldChange,
  onVerificationChange,
  onRequestRejection,
  onCancelRejection,
  onConfirmRejection,
  onApprove,
}: ReviewDecisionFieldsProps) {
  const locked = busy || decisionIsLocked(snapshot.phase);
  const rejectionConfirmationOpen = snapshot.rejectionConfirmationOpen;
  const commentId = "review-decision-comment";
  const reviewerId = "review-decision-reviewer";
  const destinationId = "review-decision-destination";

  return (
    <section
      aria-labelledby="review-decision-heading"
      className="space-y-5 border-t border-slate-200 p-4 sm:p-6"
    >
      <header className="space-y-1">
        <h2 id="review-decision-heading" className="text-base font-semibold text-slate-900">
          Decisión de revisión
        </h2>
        <p className="text-sm text-slate-600">
          El servidor registra la decisión y el destino; no confirma que el documento se haya enviado.
        </p>
      </header>

      {!canApprove && canReject ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No hay una extracción verificable para aprobar. El rechazo confirmado sigue disponible.
        </p>
      ) : null}
      {!canApprove && !canReject ? (
        <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          Este documento no admite una decisión en su estado actual.
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor={reviewerId} className="block text-sm font-medium text-slate-800">
          Revisor declarado
        </label>
        <Input
          id={reviewerId}
          autoComplete="off"
          maxLength={100}
          value={snapshot.form.reviewer}
          disabled={locked || (!canApprove && !canReject)}
          onChange={(event) => onFieldChange("reviewer", event.currentTarget.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={commentId} className="block text-sm font-medium text-slate-800">
          {rejectionConfirmationOpen ? "Motivo del rechazo" : "Comentario de la revisión"}
        </label>
        <Textarea
          id={commentId}
          maxLength={2000}
          placeholder={rejectionConfirmationOpen ? "Escribe el motivo" : "Escribe un comentario"}
          value={snapshot.form.comment}
          disabled={locked || (!canApprove && !canReject)}
          onChange={(event) => onFieldChange("comment", event.currentTarget.value)}
        />
        <p className="text-xs text-slate-600">
          El comentario es obligatorio. Se registra como motivo del rechazo cuando confirmas esa acción.
        </p>
      </div>

      {!rejectionConfirmationOpen && canApprove ? (
        <>
          <div className="space-y-2">
            <label htmlFor={destinationId} className="block text-sm font-medium text-slate-800">
              Destino final
            </label>
            <NativeSelect
              id={destinationId}
              value={snapshot.form.destination}
              disabled={locked}
              onChange={(event) => onFieldChange("destination", event.currentTarget.value)}
            >
              <option value="">Selecciona un destino final</option>
              {finalDestinations.map((destination) => (
                <option key={destination.value} value={destination.value}>
                  {destination.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
            <Checkbox
              checked={snapshot.form.verified}
              disabled={locked}
              onChange={(event) => onVerificationChange(event.currentTarget.checked)}
            />
            <span className="space-y-1">
              <span className="block font-medium">Confirmo la revisión de los datos y la decisión.</span>
              <span className="block text-xs text-slate-600">
                El revisor, el comentario y el destino final siguen siendo obligatorios. Cualquier cambio invalida esta verificación.
              </span>
            </span>
          </label>
        </>
      ) : null}

      {snapshot.phase === "submitting" ? (
        <p role="status" className="text-sm text-slate-700">
          Enviando decisión… No cierres esta revisión.
        </p>
      ) : null}
      {snapshot.phase === "reloading-conflict" ? (
        <p role="status" className="text-sm text-slate-700">
          Volviendo a leer el documento después del conflicto…
        </p>
      ) : null}
      {snapshot.phase === "error" && snapshot.error ? (
        <p role="alert" className="wrap-break-word rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          No se confirmó la decisión: {snapshot.error}
        </p>
      ) : null}
      {snapshot.phase === "conflict" && snapshot.error ? (
        <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{snapshot.error} No se enviará otra decisión desde esta revisión.</p>
          {snapshot.latestDocument ? (
            <p>
              Estado actualizado del servidor: {snapshot.latestDocument.status} · Procesamiento: {snapshot.latestDocument.processing_status}.
            </p>
          ) : null}
        </div>
      ) : null}
      {snapshot.phase === "uncertain" && snapshot.error ? (
        <p role="alert" className="wrap-break-word rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {snapshot.error}
        </p>
      ) : null}
      {snapshot.phase === "confirmed" ? (
        <p role="status" className="text-sm text-teal-800">
          La decisión quedó confirmada por el servidor.
        </p>
      ) : null}
      {snapshot.phase === "confirmed-refresh-error" && snapshot.error ? (
        <p role="alert" className="wrap-break-word rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          La decisión quedó confirmada, pero no se actualizaron las colecciones: {snapshot.error}
        </p>
      ) : null}

      {rejectionConfirmationOpen ? (
        <section
          aria-labelledby="reject-document-heading"
          className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <h3 id="reject-document-heading" className="text-sm font-semibold text-red-900">
            Rechazar documento
          </h3>
          <p className="text-sm text-red-800">
            Confirma el motivo escrito y el revisor declarado. Las propuestas locales no se aplican al rechazo.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={locked}
              onClick={onCancelRejection}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={locked || !canReject}
              onClick={onConfirmRejection}
            >
              {snapshot.phase === "submitting" ? "Enviando rechazo…" : "Confirmar rechazo"}
            </Button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            disabled={locked || !canApprove}
            onClick={onApprove}
          >
            {hasEffectiveCorrections ? "Corregir y aprobar" : "Aprobar revisión"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={locked || !canReject}
            onClick={onRequestRejection}
          >
            Rechazar documento
          </Button>
        </div>
      )}
    </section>
  );
}
