import { useState } from "react";
import { AllDocumentsView } from "./components/dashboard/AllDocumentsView";
import { LoadingState } from "./components/dashboard/LoadingState";
import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { DashboardLayout } from "./layout/DashboardLayout";
import { DocumentCount } from "./components/dashboard/DocumentCount";
import { DashboardFooter } from "./components/dashboard/DashboardFooter";
import { Button } from "./components/ui/button";
import { useTriajes } from "./hooks/useTriajes";
import type { DashboardView } from "@/types/navigation";

function App() {
  const {
    handleReview,
    handleRetry,
    handleDocumentUploaded,
    handleHistoryPageChange,
    mensaje,
    status,
    criticalAlertsCount,
    historial,
    casosRevision,
    reviewError,
    reviewingId,
    historyLoading,
    historyError,
  } = useTriajes();
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

  // Render Concidicional
  if (status === "esperando") {
    return <LoadingState />;
  }
  if (status === "error") {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center">
        <h2>{mensaje}</h2>
        <Button variant="destructive" onClick={handleRetry}>
          Reintentar
        </Button>
      </div>
    );
  } else {
    // Render App
    return (
      <>
        <DashboardLayout
          activeView={activeView}
          onViewChange={setActiveView}
          criticalAlertsCount={criticalAlertsCount}
        >
          {mensaje && (
            <p className="mb-3 text-sm text-muted-foreground" role="status">
              {mensaje}
            </p>
          )}
          {activeView === "history" ? (
            <AllDocumentsView
              documents={historial.items}
              total={historial.total}
              offset={historial.offset}
              limit={historial.limit}
              isLoading={historyLoading}
              error={historyError}
              onPageChange={handleHistoryPageChange}
            />
          ) : (
            <>
              <DocumentCount
                total={historial.total}
                criticalAlerts={criticalAlertsCount}
              />
              <DocumentUpload onUpload={handleDocumentUploaded} />
              <CriticalCasesQueue
                cases={casosRevision}
                onReview={handleReview}
                reviewError={reviewError}
                reviewingId={reviewingId}
              />
              <DashboardFooter />
            </>
          )}
        </DashboardLayout>
      </>
    );
  }
}

export default App;
