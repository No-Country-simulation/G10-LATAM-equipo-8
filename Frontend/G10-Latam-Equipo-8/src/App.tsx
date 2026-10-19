import { useState } from "react";
import { AllDocumentsView } from "./components/dashboard/AllDocumentsView";
import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { UploadStatus } from "./components/dashboard/UploadStatus";
import { Button } from "./components/ui/button";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { prioridadClinicaLegible } from "./hooks/documentUploadController";
import { useTriajes } from "./hooks/useTriajes";
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
  const {
    handleReview,
    handleRetry,
    handleDocumentUploaded,
    handleHistoryPageChange,
    mensaje,
    status,
    auditPendingCount,
    historial,
    casosRevision,
    reviewError,
    reviewingId,
    historyLoading,
    historyError,
  } = useTriajes();
  const [activeView, setActiveView] = useState<DashboardView>("pending");
  const { uploadState, uploadFile } = useDocumentUpload(handleDocumentUploaded);
  const listsLoaded = status === "exito";
  const urgentDocuments = listsLoaded
    ? historial.items.filter(
        (document) => document.decision_enrutamiento.alerta_urgente === true,
      )
    : [];
  const urgentAlertCount = listsLoaded ? urgentDocuments.length : null;

  return (
    <DashboardLayout
      pageTitle={viewTitles[activeView]}
      activeView={activeView}
      onViewChange={setActiveView}
      auditPendingCount={listsLoaded ? auditPendingCount : null}
      urgentAlertCount={urgentAlertCount}
      provenance={triajeService.provenance}
    >
      <UploadStatus uploadState={uploadState} />

      {status === "error" && (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
        >
          <p>No se pudieron cargar las colecciones: {mensaje}</p>
          <Button variant="outline" onClick={handleRetry}>
            Reintentar listas
          </Button>
        </section>
      )}
      {status === "esperando" && activeView !== "upload" && (
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          Cargando la colección solicitada…
        </p>
      )}

      {activeView === "upload" && (
        <DocumentUpload uploadState={uploadState} onFileSelected={uploadFile} />
      )}

      {listsLoaded && activeView === "pending" && (
        <section aria-label="Pendientes de auditoría" className="flex min-h-0 flex-1 flex-col gap-4">
          <p className="text-sm text-slate-600">
            La cantidad pendiente corresponde a auditoría humana y no representa alertas de urgencia clínica.
          </p>
          {casosRevision.length > 0 ? (
            <CriticalCasesQueue
              cases={casosRevision}
              onReview={handleReview}
              reviewError={reviewError}
              reviewingId={reviewingId}
            />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
              <h2 className="text-lg font-semibold text-slate-900">Pendientes</h2>
              <p className="mt-2">No hay documentos pendientes de auditoría.</p>
            </div>
          )}
        </section>
      )}

      {listsLoaded && activeView === "all" && (
        <AllDocumentsView
          documents={historial.items}
          total={historial.total}
          offset={historial.offset}
          limit={historial.limit}
          isLoading={historyLoading}
          error={historyError}
          onPageChange={handleHistoryPageChange}
        />
      )}

      {listsLoaded && activeView === "alerts" && (
        <section aria-labelledby="urgent-alerts-title" className="flex flex-col gap-4">
          <header>
            <h2 id="urgent-alerts-title" className="text-2xl font-semibold text-slate-900">
              Alertas inmediatas
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Solo incluye registros con alerta_urgente igual a true entre los {historial.items.length} documentos cargados en esta página del historial. No es un conteo global.
            </p>
          </header>
          {urgentDocuments.length === 0 ? (
            <p role="status" className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
              No hay alertas inmediatas entre los documentos cargados de esta página.
            </p>
          ) : (
            <ul className="grid gap-3">
              {urgentDocuments.map((document) => (
                <li
                  key={document.documento_id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <article className="flex flex-col gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {document.datos_extraidos.paciente.nombre ?? "Paciente sin identificar"}
                    </h3>
                    <p className="text-sm text-slate-700">
                      Documento: {document.documento_id}
                    </p>
                    <p className="text-sm text-slate-700">
                      Alerta urgente informada por el backend
                    </p>
                    <p className="text-sm text-slate-700">
                      Prioridad clínica: {prioridadClinicaLegible(document.clasificacion.nivel_prioridad)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {document.decision_enrutamiento.justificacion_enrutamiento}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </DashboardLayout>
  );
}

export default App;
