import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { DashboardLayout } from "./layout/DashboardLayout";
import { DocumentCount } from "./components/dashboard/DocumentCount";
import { DashboardFooter } from "./components/dashboard/DashboardFooter";
import { useState } from "react";
import { mockTriajes } from "./mocks/triaje";
import type { TriajeDocumento } from "./types/triaje";

function App() {
  // estado del triaje
  const [triajes, setTriajes] = useState<TriajeDocumento[]>(mockTriajes);
  // logica del boton aprobar
  const handleApprove = (id: string) => {
    setTriajes((prev) =>
      prev.map((doc) =>
        doc.documento_id === id
          ? {
              ...doc,
              status: "aprobado",
              decision_enrutamiento: {
                ...doc.decision_enrutamiento,
                requiere_auditoria_humana: false,
              },
            }
          : doc,
      ),
    );
  };
  // logica del boton rechazar
  const handleReject = (id: string) => {
    setTriajes((prev) =>
      prev.map((doc) =>
        doc.documento_id === id
          ? {
              ...doc,
              status: "rechazado",
              decision_enrutamiento: {
                ...doc.decision_enrutamiento,
                requiere_auditoria_humana: false,
              },
            }
          : doc,
      ),
    );
  };
  // Contador de la card DocumentCount
  const criticalAlertsCount = triajes.filter(
    (t) => t.decision_enrutamiento.requiere_auditoria_humana,
  ).length;
  return (
    <>
      <DashboardLayout>
        <DocumentCount
          total={triajes.length}
          criticalAlerts={criticalAlertsCount}
        />
        <DocumentUpload />
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

export default App;
