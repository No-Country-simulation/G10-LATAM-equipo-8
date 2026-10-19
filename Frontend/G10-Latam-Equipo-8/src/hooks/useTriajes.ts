import { useCallback, useEffect, useState } from "react";
import type { HistoryResponse, ReviewRequest, TriajeDocumento } from "@/types/triaje";
import { triajeService } from "@/services/triajeService";

const paginaInicial: HistoryResponse = {
  items: [],
  total: 0,
  offset: 0,
  limit: 20,
};

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

export function useTriajes() {
  const [historial, setHistorial] = useState<HistoryResponse>(paginaInicial);
  const [colaAuditoria, setColaAuditoria] = useState<HistoryResponse>(paginaInicial);
  const [status, setStatus] = useState<"esperando" | "error" | "exito">(
    "esperando",
  );
  const [mensaje, setMensaje] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [intentos, setIntentos] = useState(0);

  const obtenerDatos = useCallback(
    (historyOffset = 0) =>
      Promise.all([
        triajeService.getTriajes({
          offset: historyOffset,
          limit: paginaInicial.limit,
        }),
        triajeService.getAuditQueue({ offset: 0, limit: paginaInicial.limit }),
      ]),
    [],
  );

  const cargarDatos = useCallback(
    async (mostrarCarga = true, historyOffset = 0) => {
      try {
        const [paginaHistorial, paginaAuditoria] =
          await obtenerDatos(historyOffset);
        setHistorial(paginaHistorial);
        setColaAuditoria(paginaAuditoria);
        setMensaje("");
        setStatus("exito");
      } catch (error) {
        setMensaje(mensajeDeError(error));
        if (mostrarCarga) setStatus("error");
        throw error;
      }
    },
    [obtenerDatos],
  );

  useEffect(() => {
    let active = true;
    const cargarInicial = async () => {
      try {
        const [paginaHistorial, paginaAuditoria] = await obtenerDatos();
        if (!active) return;
        setHistorial(paginaHistorial);
        setColaAuditoria(paginaAuditoria);
        setMensaje("");
        setStatus("exito");
      } catch (error) {
        if (!active) return;
        setMensaje(mensajeDeError(error));
        setStatus("error");
      }
    };
    void cargarInicial();
    return () => {
      active = false;
    };
  }, [intentos, obtenerDatos]);

  const handleHistoryPageChange = useCallback(
    async (offset: number): Promise<void> => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const pagina = await triajeService.getTriajes({
          offset,
          limit: historial.limit,
        });
        setHistorial(pagina);
      } catch (error) {
        setHistoryError(mensajeDeError(error));
      } finally {
        setHistoryLoading(false);
      }
    },
    [historial.limit],
  );

  const handleReview = useCallback(
    async (id: string, request: ReviewRequest): Promise<void> => {
      setReviewingId(id);
      setReviewError("");
      setMensaje("");
      let actualizado: TriajeDocumento;
      try {
        actualizado = await triajeService.revisarDocumento(id, request);
      } catch (error) {
        const message = mensajeDeError(error);
        setReviewError(message);
        throw error;
      } finally {
        setReviewingId(null);
      }

      setHistorial((actual) => ({
        ...actual,
        items: actual.items.map((item) =>
          item.documento_id === id ? actualizado : item,
        ),
      }));
      setColaAuditoria((actual) => ({
        ...actual,
        items: actual.items.filter((item) => item.documento_id !== id),
        total: Math.max(0, actual.total - 1),
      }));

      try {
        await cargarDatos(false, historial.offset);
      } catch (error) {
        setMensaje(
          `La revisión quedó registrada, pero no se pudo actualizar la lista: ${mensajeDeError(error)}`,
        );
      }
    },
    [cargarDatos, historial.offset],
  );

  const handleDocumentUploaded = useCallback((nuevoDocumento: TriajeDocumento) => {
    setHistorial((actual) => ({
      ...actual,
      items:
        actual.offset === 0
          ? [nuevoDocumento, ...actual.items].slice(0, actual.limit)
          : actual.items,
      total: actual.total + 1,
    }));
    if (nuevoDocumento.status === "NEEDS_AUDIT") {
      setColaAuditoria((actual) => {
        if (
          actual.items.some(
            (item) => item.documento_id === nuevoDocumento.documento_id,
          )
        ) {
          return actual;
        }
        return {
          ...actual,
          items: [nuevoDocumento, ...actual.items].slice(0, actual.limit),
          total: actual.total + 1,
        };
      });
    }
  }, []);

  const handleRetry = useCallback(() => {
    setMensaje("");
    setStatus("esperando");
    setIntentos((actual) => actual + 1);
  }, []);

  return {
    handleReview,
    handleRetry,
    handleDocumentUploaded,
    handleHistoryPageChange,
    mensaje,
    status,
    auditPendingCount: colaAuditoria.total,
    triajes: historial.items,
    historial,
    casosRevision: colaAuditoria.items,
    reviewError,
    reviewingId,
    historyLoading,
    historyError,
  };
}
