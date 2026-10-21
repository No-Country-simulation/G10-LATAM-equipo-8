import { Button } from "@/components/ui/button";
import type { DocumentUploadSnapshot } from "@/hooks/documentUploadController";
import {
  estadoProcesamientoLegible,
  estadoRevisionLegible,
  prioridadClinicaLegible,
} from "@/hooks/documentUploadController";
import type { TriajeDocumento } from "@/types/triaje";

interface Props {
  uploadState: DocumentUploadSnapshot;
  onOpenConfirmedDocument?: (document: TriajeDocumento) => void;
}

export function UploadStatus({ uploadState, onOpenConfirmedDocument }: Props) {
  if (uploadState.phase === "idle" && !uploadState.confirmedDocument) return null;

  const confirmedDocument = uploadState.confirmedDocument;
  const isFailed = uploadState.phase === "failed";
  const resultTitle =
    uploadState.phase === "confirmed"
      ? "Resultado confirmado"
      : "Último resultado confirmado";

  return (
    <section
      aria-labelledby="upload-status-title"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 id="upload-status-title" className="sr-only">
        Estado de carga
      </h2>
      {uploadState.phase === "uploading" && (
        <div role="status" aria-live="polite" className="text-sm text-slate-700">
          <p className="font-semibold">Cargando…</p>
          <p className="mt-1 break-all">{uploadState.fileName}</p>
          <p className="mt-1 text-slate-600">
            La solicitud sigue activa aunque cambies de destino.
          </p>
        </div>
      )}
      {isFailed && (
        <div role="alert" aria-live="assertive" className="text-sm text-red-700">
          <p className="font-semibold">No se pudo cargar {uploadState.fileName}.</p>
          <p className="mt-1 wrap-break-word">{uploadState.error}</p>
        </div>
      )}
      {uploadState.collectionRefreshError && (
        <p role="alert" className="mt-2 text-sm text-amber-700">
          El documento quedó registrado, pero no se pudo actualizar la lista: {uploadState.collectionRefreshError}
        </p>
      )}
      {confirmedDocument && (
        <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700">
          <h3 className="font-semibold text-slate-900">{resultTitle}</h3>
          <p className="mt-1 break-all">
            Archivo: {uploadState.confirmedFileName ?? uploadState.fileName}
          </p>
          <p className="break-all">Documento: {confirmedDocument.documento_id}</p>
          <p>Revisión: {estadoRevisionLegible(confirmedDocument.status)}</p>
          <p>Procesamiento técnico: {estadoProcesamientoLegible(confirmedDocument.processing_status)}</p>
          <p>Prioridad clínica: {prioridadClinicaLegible(confirmedDocument.clasificacion.nivel_prioridad)}</p>
          {confirmedDocument.processing_status === "FAILED" && (
            <p className="mt-2 text-amber-700">
              El servidor registró el documento, pero el procesamiento falló; no es una extracción exitosa.
            </p>
          )}
          {confirmedDocument.processing_error && (
            <p className="mt-1 wrap-break-word text-slate-600">
              Diagnóstico técnico: {confirmedDocument.processing_error}
            </p>
          )}
          {onOpenConfirmedDocument && (
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto min-h-11 px-0 text-teal-800"
              onClick={() => onOpenConfirmedDocument(confirmedDocument)}
            >
              Abrir resultado
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
