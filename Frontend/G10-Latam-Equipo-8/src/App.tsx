import { useState } from "react";
import { DocumentCollectionView } from "./components/dashboard/DocumentCollectionView";
import { DocumentReviewDialog } from "./components/dashboard/DocumentReviewDialog";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { UploadStatus } from "./components/dashboard/UploadStatus";
import { useDocumentCollections } from "./hooks/useDocumentCollections";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { countUrgentAlerts } from "./hooks/documentCollectionsController";
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
        provenance={triajeService.provenance}
      >
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
        />
      ) : null}
    </>
  );
}

export default App;
