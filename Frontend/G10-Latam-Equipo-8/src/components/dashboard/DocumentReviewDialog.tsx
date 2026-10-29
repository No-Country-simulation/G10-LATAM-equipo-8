import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DocumentOriginalViewer } from "./DocumentOriginalViewer";
import { ReviewDecisionFields } from "./ReviewDecisionFields";
import { ReviewDocumentFields } from "./ReviewDocumentFields";
import {
  auditReasonLabel,
  processingStatusLabel,
  reviewStatusLabel,
  statusTransitionLabel,
} from "../../lib/documentLabels";
import {
  clearAgeProposal,
  createReviewDraft,
  displayReviewValue,
  isReviewDraftDirty,
  reviewEligibility,
  updateReviewDraft,
  type ReviewDraft,
  type ReviewDraftTextField,
} from "./reviewDraft";
import { useDocumentReview } from "../../hooks/useDocumentReview";
import {
  buildSupportedReviewCorrections,
  canRejectDocument,
  isReviewDecisionDirty,
  type DocumentReviewCollectionRefreshError,
} from "../../hooks/documentReviewDecisionController";
import { useDocumentReviewDecision } from "../../hooks/useDocumentReviewDecision";
import type { ReviewEventResponse, TriajeDocumento } from "../../types/triaje";

export interface DocumentReviewDialogProps {
  document: TriajeDocumento;
  onClose: () => void;
  onReturnFocus?: () => void;
  busy?: boolean;
  refreshCollections: () => Promise<void>;
  onDecisionConfirmed: (document: TriajeDocumento) => void;
  onCollectionRefreshError: (error: DocumentReviewCollectionRefreshError) => void;
}

interface DraftSession {
  documentId: string;
  baseline: TriajeDocumento;
  draft: ReviewDraft;
}

function reviewActionLabel(action: ReviewEventResponse["action"]): string {
  if (action === "corregir_aprobar") return "Corregir y aprobar";
  if (action === "rechazar") return "Rechazar";
  return "Aprobar";
}

const correctionLabels: Record<string, string> = {
  nombre_paciente: "Nombre del paciente",
  edad_paciente: "Edad",
  tipo_documento: "Tipo de documento",
  nivel_prioridad: "Prioridad clínica",
};

function ReviewEventsContent({
  resource,
}: {
  resource: ReturnType<typeof useDocumentReview>["reviews"];
}) {
  return (
    <section
      aria-labelledby="review-events-heading"
      className="space-y-3 border-t border-border pt-5"
    >
      <h2 id="review-events-heading" className="text-base font-semibold text-foreground">
        Revisiones registradas
      </h2>
      {resource.status === "loading" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando eventos de revisión…
        </p>
      ) : null}
      {resource.status === "error" ? (
        <p role="alert" className="wrap-break-word text-sm text-red-800 dark:text-red-200">
          No se pudo cargar el historial de revisiones: {resource.error}
        </p>
      ) : null}
      {resource.status === "loaded" && resource.value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay eventos de revisión registrados para este documento.
        </p>
      ) : null}
      {resource.status === "loaded" && resource.value.length > 0 ? (
        <ol className="space-y-4">
          {resource.value.map((event) => (
            <li
              key={event.review_id}
              className="space-y-2 border-b border-border pb-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {reviewActionLabel(event.action)}
                </h3>
                <time
                  dateTime={event.created_at}
                  className="text-xs text-muted-foreground"
                >
                  {event.created_at}
                </time>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Revisor declarado: {event.reviewer}
              </p>
              <p className="wrap-break-word text-sm text-slate-700 dark:text-slate-300">
                Comentario: {displayReviewValue(event.comment)}
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Estado de revisión
                  </dt>
                  <dd className="wrap-break-word text-foreground">
                    {statusTransitionLabel(
                      event.previous_status,
                      event.new_status,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Destino registrado
                  </dt>
                  <dd className="wrap-break-word text-foreground">
                    {event.previous_destination} → {event.new_destination}
                  </dd>
                </div>
              </dl>
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Correcciones registradas
                </h4>
                {event.corrections.length === 0 ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Sin correcciones registradas.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {event.corrections.map((correction, index) => (
                      <li
                        key={`${correction.field}-${index}`}
                        className="wrap-break-word text-sm text-slate-700 dark:text-slate-300"
                      >
                        {correctionLabels[correction.field] ?? correction.field}: {displayReviewValue(correction.before)} → {displayReviewValue(correction.after)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function ReviewEvents({
  resource,
}: {
  resource: ReturnType<typeof useDocumentReview>["reviews"];
}) {
  return (
    <div className="px-4 pb-4 sm:px-6 sm:pb-6">
      <ReviewEventsContent resource={resource} />
    </div>
  );
}

export function DocumentReviewDialog({
  document,
  onClose,
  onReturnFocus,
  busy = false,
  refreshCollections,
  onDecisionConfirmed,
  onCollectionRefreshError,
}: DocumentReviewDialogProps) {
  const documentId = document.documento_id;
  const resources = useDocumentReview(documentId);
  const decision = useDocumentReviewDecision({
    refreshCollections,
    onDecisionConfirmed,
    onCollectionRefreshError,
  });
  const [storedDraftSession, setStoredDraftSession] =
    useState<DraftSession | null>(null);
  const [reviewEditMode, setReviewEditMode] = useState<{
    documentId: string;
    enabled: boolean;
  } | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState(() => ({
    documentId,
    open: false,
  }));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const continueEditingRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const loadedDetail =
    resources.detail.status === "loaded" ? resources.detail.value : null;

  const draftSession = useMemo(() => {
    if (!loadedDetail) return null;
    if (
      storedDraftSession?.documentId === documentId &&
      storedDraftSession.baseline === loadedDetail
    ) {
      return storedDraftSession;
    }
    return {
      documentId,
      baseline: loadedDetail,
      draft: createReviewDraft(loadedDetail),
    };
  }, [documentId, loadedDetail, storedDraftSession]);
  const confirmDiscard =
    discardPrompt.documentId === documentId && discardPrompt.open;

  function setConfirmDiscard(open: boolean) {
    setDiscardPrompt({ documentId, open });
  }

  const activeSession =
    draftSession?.documentId === documentId &&
    loadedDetail &&
    draftSession.baseline === loadedDetail
      ? draftSession
      : null;
  const dirty = (activeSession
    ? isReviewDraftDirty(activeSession.baseline, activeSession.draft)
    : false) || isReviewDecisionDirty(decision.snapshot);
  const context = loadedDetail ?? document;
  const eligibility = reviewEligibility(context);
  const editingEnabled =
    reviewEditMode?.documentId === documentId && reviewEditMode.enabled;
  const decisionBusy =
    decision.snapshot.phase === "submitting" ||
    decision.snapshot.phase === "reloading-conflict";
  const closeBlocked = busy || decisionBusy;
  const proposedCorrections = activeSession
    ? buildSupportedReviewCorrections(activeSession.baseline, activeSession.draft)
    : {};

  useEffect(() => {
    if (confirmDiscard && !closeBlocked) continueEditingRef.current?.focus();
  }, [confirmDiscard, closeBlocked]);

  function requestClose() {
    if (closeBlocked) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function enableReviewEditing() {
    if (closeBlocked || !activeSession || !reviewEligibility(activeSession.baseline).editable) return;
    setReviewEditMode({ documentId, enabled: true });
  }

  function handleDraftChange(field: ReviewDraftTextField, value: string) {
    decision.invalidateVerification();
    setStoredDraftSession((current) => {
      if (!loadedDetail) return current;
      const session =
        current?.documentId === documentId && current.baseline === loadedDetail
          ? current
          : {
              documentId,
              baseline: loadedDetail,
              draft: createReviewDraft(loadedDetail),
            };
      if (field === "priority") {
        const priority =
          value === "Rutina" || value === "Urgente" ? value : "";
        return {
          ...session,
          draft: updateReviewDraft(session.draft, "priority", priority),
        };
      }
      return {
        ...session,
        draft: updateReviewDraft(session.draft, field, value),
      };
    });
  }

  function handleAgeClear() {
    decision.invalidateVerification();
    setStoredDraftSession((current) => {
      if (!loadedDetail) return current;
      const session =
        current?.documentId === documentId && current.baseline === loadedDetail
          ? current
          : {
              documentId,
              baseline: loadedDetail,
              draft: createReviewDraft(loadedDetail),
            };
      return { ...session, draft: clearAgeProposal(session.draft) };
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        aria-describedby="document-review-description"
        className="overflow-hidden"
        onOpenAutoFocus={() => {
          const active = window.document.activeElement;
          if (active instanceof HTMLElement) openerRef.current = active;
        }}
        onCloseAutoFocus={(event) => {
          if (onReturnFocus) {
            event.preventDefault();
            onReturnFocus();
            return;
          }
          const fallback = [
            openerRef.current,
            ...window.document.querySelectorAll<HTMLElement>(
              "[data-review-dialog-return-focus]",
            ),
            window.document.querySelector<HTMLElement>(
              "[data-review-collection-focus]",
            ),
          ].find((element) => element?.isConnected && element.getClientRects().length > 0);
          if (fallback) {
            event.preventDefault();
            fallback.focus({ preventScroll: true });
          }
        }}
        onEscapeKeyDown={(event) => {
          if (closeBlocked || dirty) {
            event.preventDefault();
            if (dirty && !closeBlocked) setConfirmDiscard(true);
          }
        }}
        onPointerDownOutside={(event) => {
          if (closeBlocked || dirty) {
            event.preventDefault();
            if (dirty && !closeBlocked) setConfirmDiscard(true);
          }
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:contents">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-6">
          <div className="min-w-0 space-y-1">
            <DialogTitle>Revisar documento</DialogTitle>
            <DialogDescription id="document-review-description" className="wrap-anywhere">
              {displayReviewValue(context.datos_extraidos.paciente.nombre)} · {documentId}
            </DialogDescription>
            <p className="wrap-break-word text-sm text-muted-foreground">
              Estado: {reviewStatusLabel(context.status)} · Procesamiento:{" "}
              {processingStatusLabel(context.processing_status)}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Prioridad clínica: {eligibility.priorityLabel}
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="outline"
            disabled={closeBlocked}
            onClick={requestClose}
          >
            Cerrar revisión
          </Button>
        </header>

        {confirmDiscard ? (
          <section
            role="alert"
            aria-labelledby="discard-review-heading"
            className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto p-6"
          >
            <div className="mx-auto w-full max-w-2xl space-y-3">
              <h2
                id="discard-review-heading"
                className="text-xl font-semibold text-foreground"
              >
                ¿Descartar las propuestas locales?
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Hay cambios sin guardar. Descartarlos cierra esta revisión; no
                modifica el documento ni envía datos al servidor.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  ref={continueEditingRef}
                  type="button"
                  variant="outline"
                  disabled={closeBlocked}
                  onClick={() => setConfirmDiscard(false)}
                >
                  Continuar editando
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={closeBlocked}
                  onClick={onClose}
                >
                  Descartar propuestas y cerrar
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="shrink-0 space-y-3 border-b border-border bg-background px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold text-foreground">
                Motivos de revisión
              </h2>
              {context.audit_reasons.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {context.audit_reasons.map((reason, index) => (
                    <li
                      key={`${reason}-${index}`}
                      className="min-w-0 max-w-full wrap-anywhere rounded-md border border-border bg-card px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                    >
                      {auditReasonLabel(reason)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay motivos de auditoría declarados.
                </p>
              )}
            </section>

            <Tabs defaultValue="data" className="flex flex-col lg:min-h-0 lg:flex-1">
              <TabsList className="shrink-0 lg:hidden">
                <TabsTrigger value="data">Datos extraídos</TabsTrigger>
                <TabsTrigger value="original">Documento original</TabsTrigger>
              </TabsList>
              <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:divide-x lg:divide-slate-200 lg:overflow-hidden">
                <TabsContent
                  value="original"
                  forceMount
                  className="min-h-0 overflow-y-visible data-[state=inactive]:hidden lg:h-full lg:overflow-y-auto lg:block lg:data-[state=inactive]:block"
                >
                  <DocumentOriginalViewer
                    documentId={documentId}
                    resource={resources.original}
                    provenance={resources.provenance}
                  />
                </TabsContent>
                <TabsContent
                  value="data"
                  forceMount
                  className="min-h-0 overflow-y-visible data-[state=inactive]:hidden lg:h-full lg:overflow-y-auto lg:block lg:data-[state=inactive]:block"
                >
                  <div className="space-y-6">
                    {resources.detail.status === "loading" ? (
                      <p role="status" className="p-6 text-sm text-muted-foreground">
                        Cargando detalle del documento…
                      </p>
                    ) : null}
                    {resources.detail.status === "error" ? (
                      <p
                        role="alert"
                        className="m-4 rounded-lg border border-red-200 dark:border-red-400 bg-red-50 dark:bg-red-950 p-4 text-sm text-red-800 dark:text-red-200"
                      >
                        No se pudo cargar el detalle: {resources.detail.error} Se
                        conserva el contexto de la bandeja y no se habilita la edición.
                      </p>
                    ) : null}
                    {activeSession ? (
                      <>
                        <ReviewDocumentFields
                          document={activeSession.baseline}
                          draft={activeSession.draft}
                          onDraftChange={handleDraftChange}
                          onAgeClear={handleAgeClear}
                          editingEnabled={editingEnabled}
                          editingDisabled={closeBlocked}
                          onEnableEditing={enableReviewEditing}
                        />
                        <ReviewDecisionFields
                          snapshot={decision.snapshot}
                          busy={closeBlocked}
                          canApprove={reviewEligibility(activeSession.baseline).state === "ready"}
                          canReject={canRejectDocument(activeSession.baseline)}
                          hasEffectiveCorrections={Object.keys(proposedCorrections).length > 0}
                          onFieldChange={decision.setField}
                          onVerificationChange={decision.setVerified}
                          onRequestRejection={decision.requestRejection}
                          onCancelRejection={decision.cancelRejection}
                          onConfirmRejection={() => {
                            void decision.confirmRejection(activeSession.baseline);
                          }}
                          onApprove={() => {
                            void decision.approve(activeSession.baseline, activeSession.draft);
                          }}
                        />
                      </>
                    ) : null}
                    <ReviewEvents resource={resources.reviews} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
        </div>
        {!confirmDiscard ? (
          <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p
              role={closeBlocked ? "status" : undefined}
              className="text-sm text-muted-foreground"
            >
              {closeBlocked
                ? "Hay una acción en curso; el cierre está bloqueado."
                : "Las propuestas no admitidas por la API son locales; solo se envían correcciones permitidas al confirmar."}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={closeBlocked}
              onClick={requestClose}
            >
              Cerrar revisión
            </Button>
          </footer>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
