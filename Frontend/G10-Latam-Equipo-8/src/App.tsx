import { useCallback, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { DocumentCollectionView } from "./components/dashboard/DocumentCollectionView";
import { DocumentReviewDialog } from "./components/dashboard/DocumentReviewDialog";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { UploadStatus } from "./components/dashboard/UploadStatus";
import { useDocumentCollections } from "./hooks/useDocumentCollections";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { countUrgentAlerts } from "./hooks/documentCollectionsController";
import type { DocumentReviewCollectionRefreshError } from "./hooks/documentReviewDecisionController";
import { DashboardLayout } from "./layout/DashboardLayout";
import { triajeService } from "./services/triajeService";
import type { DashboardView } from "@/types/navigation";

const viewTitles: Record<DashboardView, string> = {
  upload: "Cargar documentos",
  pending: "Pendientes",
  all: "Todos los documentos",
  alerts: "Alertas inmediatas",
};

function App() {
  const collections = useDocumentCollections();
  const [activeView, setActiveView] = useState<DashboardView>("pending");
  const { uploadState, uploadFile } = useDocumentUpload(collections.refreshCollections);
  const closeDocument = collections.closeDocument;
  const refreshCollections = collections.refreshCollections;
  const focusAfterConfirmedReview = useRef(false);
  const refreshReviewedCollections = useCallback(async () => {
    const restoreFocus = focusAfterConfirmedReview.current;
    focusAfterConfirmedReview.current = false;
    try {
      await refreshCollections();
    } finally {
      if (restoreFocus) {
        requestAnimationFrame(() => {
          if (document.activeElement === document.body && !document.querySelector('[role="dialog"]')) {
            document.querySelector<HTMLElement>("[data-review-collection-focus]")?.focus({ preventScroll: true });
          }
        });
      }
    }
  }, [refreshCollections]);
  const [reviewRefreshError, setReviewRefreshError] = useState<DocumentReviewCollectionRefreshError | null>(null);
  const handleDecisionConfirmed = useCallback(() => {
    focusAfterConfirmedReview.current = true;
    setReviewRefreshError(null);
    closeDocument();
  }, [closeDocument]);
  const handleReviewRefreshError = useCallback(
    (error: DocumentReviewCollectionRefreshError) => setReviewRefreshError(error),
    [],
  );
  const page = activeView === "pending" ? collections.auditQueue : collections.history;
  const hasPage =
    activeView === "pending" ? collections.hasAuditQueue : collections.hasHistory;
  const isLoading =
    activeView === "pending"
      ? collections.auditQueueState === "loading"
      : collections.historyState === "loading";
  const error =
    activeView === "pending" ? collections.auditQueueError : collections.historyError;
  const urgentAlertCount = collections.hasHistory
    ? countUrgentAlerts(collections.history.items)
    : null;

  return (
    <>
      <DashboardLayout
        pageTitle={viewTitles[activeView]}
        activeView={activeView}
        onViewChange={setActiveView}
        auditPendingCount={collections.hasAuditQueue ? collections.auditQueue.total : null}
        urgentAlertCount={urgentAlertCount}
        allDocumentsCount={collections.allDocumentsTotal ?? null}
        provenance={triajeService.provenance}
      >
        {reviewRefreshError ? (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {reviewRefreshError.decisionConfirmed
                ? "La decisión quedó confirmada por el servidor, pero falló la actualización de las colecciones:"
                : "La decisión no se confirmó. El documento se volvió a leer, pero falló la actualización de las colecciones:"} {reviewRefreshError.message} No se enviará otra decisión automáticamente.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewRefreshError(null)}
            >
              Cerrar aviso
            </Button>
          </div>
        ) : null}

        <UploadStatus
          uploadState={uploadState}
          onOpenConfirmedDocument={collections.openDocument}
        />

        {activeView === "upload" ? (
          <DocumentUpload uploadState={uploadState} onFileSelected={uploadFile} />
        ) : (
          <DocumentCollectionView
            kind={activeView}
            page={page}
            hasPage={hasPage}
            isLoading={isLoading}
            error={error}
            search={collections.search}
            documentType={collections.documentType}
            reviewStatusFilter={collections.reviewStatusFilter}
            onSearchChange={collections.setSearch}
            onDocumentTypeChange={collections.setDocumentType}
            onReviewStatusChange={collections.setReviewStatus}
            onPageChange={
              activeView === "pending"
                ? collections.loadAuditPage
                : collections.loadHistoryPage
            }
            onRetry={
              activeView === "pending"
                ? collections.retryAuditQueue
                : collections.retryHistory
            }
            onOpenDocument={collections.openDocument}
          />
        )}
      </DashboardLayout>

      {collections.selectedDocument ? (
        <DocumentReviewDialog
          key={collections.selectedDocument.documento_id}
          document={collections.selectedDocument}
          onClose={collections.closeDocument}
          refreshCollections={refreshReviewedCollections}
          onDecisionConfirmed={handleDecisionConfirmed}
          onCollectionRefreshError={handleReviewRefreshError}
        />
      ) : null}
    </>
  );
}

export default App;
