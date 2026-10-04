import { useState } from "react";
import { useEffect } from "react";
import type { TriajeDocumento } from "@/types/triaje";
import { triajeService } from "@/services/triajeService";

export function useTriajes() {
  // estado del triaje
  const [triajes, setTriajes] = useState<TriajeDocumento[]>([]);
  const [status, setStatus] = useState<"esperando" | "error" | "exito">(
    "esperando",
  );
  const [mensaje, setMensaje] = useState<string>("");
  const [intentos, setIntentos] = useState<number>(0);

  // Pedido del Triaje
  useEffect(() => {
    async function pedirTriajes() {
      setStatus("esperando");
      try {
        const lista = await triajeService.getTriajes();
        setTriajes(lista);
        setStatus("exito");
      } catch (error) {
        if (error instanceof Error) {
          setMensaje(error.message);
        } else {
          setMensaje("Ocurrió un error inesperado");
        }
        setStatus("error");
      }
    }
    pedirTriajes();
  }, [intentos]);

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

  // Recibo del nuevoDoc con handleDocumentUploaded
  const handleDocumentUploaded = (nuevoDoc: TriajeDocumento) => {
    setTriajes((prev) => [nuevoDoc, ...prev]);
  };

  // Logica de Reintentos handleRetry
  const handleRetry = () => {
    setIntentos((prev) => prev + 1);
  };

  // Contador de la card DocumentCount
  const criticalAlertsCount = triajes.filter(
    (t) => t.decision_enrutamiento.requiere_auditoria_humana,
  ).length;
  return {
    handleApprove,
    handleReject,
    handleRetry,
    handleDocumentUploaded,
    mensaje,
    status,
    criticalAlertsCount,
    triajes,
  };
}
