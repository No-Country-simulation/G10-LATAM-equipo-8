import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { DashboardLayout } from "./layout/DashboardLayout";
import { DocumentCount } from "./components/dashboard/DocumentCount";
import { DashboardFooter } from "./components/dashboard/DashboardFooter";
import { Button } from "./components/ui/button";
import { Spinner } from "./components/ui/spinner";
import { useTriajes } from "./hooks/useTriajes";

function App() {
  const {
    handleApprove,
    handleReject,
    handleRetry,
    handleDocumentUploaded,
    mensaje,
    status,
    criticalAlertsCount,
    triajes,
  } = useTriajes();

  // Render Concidicional
  if (status === "esperando") {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center">
        <h2>Esperando Lista de Triajes...</h2>
        <Spinner></Spinner>
      </div>
    );
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
        <DashboardLayout>
          <DocumentCount
            total={triajes.length}
            criticalAlerts={criticalAlertsCount}
          />
          <DocumentUpload onUpload={handleDocumentUploaded} />
          <CriticalCasesQueue
            cases={triajes}
            onApprove={handleApprove}
            onReject={handleReject}
          />
          <DashboardFooter></DashboardFooter>
        </DashboardLayout>
      </>
    );
  }
}

export default App;
