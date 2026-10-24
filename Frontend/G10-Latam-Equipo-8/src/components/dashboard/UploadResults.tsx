import { Button } from "@/components/ui/button";
import type {
  ConfirmedDocumentUploadResult,
  DocumentUploadSnapshot,
} from "@/hooks/documentUploadController";
import {
  estadoProcesamientoLegible,
  estadoRevisionLegible,
  prioridadClinicaLegible,
} from "@/hooks/documentUploadController";
import type { TriajeDocumento } from "@/types/triaje";

export type UploadResultPresentation = "history" | "latest" | "legacy";

interface Props {
  uploadState: DocumentUploadSnapshot;
  presentation: UploadResultPresentation;
  onOpenConfirmedDocument?: (document: TriajeDocumento) => void;
}

interface ConfirmedResultProps {
  result: ConfirmedDocumentUploadResult;
  title: string;
  onOpenConfirmedDocument?: (document: TriajeDocumento) => void;
}

function ConfirmedResult({ result, title, onOpenConfirmedDocument }: ConfirmedResultProps) {
  const { document } = result;

  return (
    <section aria-label="Resultado confirmado" className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {result.fileName && <p className="mt-1 break-all text-sm text-slate-700">Archivo: {result.fileName}</p>}
      <p className="break-all text-sm text-slate-700">Documento: {document.documento_id}</p>
      <p className="text-sm text-slate-700">Revisión: {estadoRevisionLegible(document.status)}</p>
      <p className="text-sm text-slate-700">
        Procesamiento técnico: {estadoProcesamientoLegible(document.processing_status)}
      </p>
      <p className="text-sm text-slate-700">
        Prioridad clínica: {prioridadClinicaLegible(document.clasificacion.nivel_prioridad)}
      </p>
      {document.processing_status === "FAILED" && (
        <p className="mt-2 text-sm text-amber-700">
          El servidor registró el documento, pero el procesamiento falló; no es una extracción exitosa.
        </p>
      )}
      {document.processing_error && (
        <p className="mt-1 wrap-break-word text-sm text-slate-600">
          Diagnóstico técnico: {document.processing_error}
        </p>
      )}
      {onOpenConfirmedDocument && (
        <Button
          type="button"
          variant="link"
          className="mt-2 h-auto min-h-11 px-0 text-teal-800"
          onClick={() => onOpenConfirmedDocument(document)}
        >
          Abrir resultado
        </Button>
      )}
    </section>
  );
}

function confirmedResults(uploadState: DocumentUploadSnapshot): readonly ConfirmedDocumentUploadResult[] {
  if (uploadState.confirmedResults?.length) return uploadState.confirmedResults;
  if (!uploadState.confirmedDocument) return [];
  return [{
    document: uploadState.confirmedDocument,
    fileName: uploadState.confirmedFileName ?? uploadState.fileName,
  }];
}

export function UploadResults({ uploadState, presentation, onOpenConfirmedDocument }: Props) {
  const results = confirmedResults(uploadState);
  if (results.length === 0) return null;

  if (presentation === "history") {
    return (
      <section aria-labelledby="confirmed-upload-results-title" className="space-y-3">
        <h2 id="confirmed-upload-results-title" className="sr-only">
          Resultados de cargas confirmadas
        </h2>
        {results.map((result, index) => (
          <ConfirmedResult
            key={`${result.document.documento_id}-${index}`}
            result={result}
            title="Resultado confirmado"
            onOpenConfirmedDocument={onOpenConfirmedDocument}
          />
        ))}
      </section>
    );
  }

  const latest = results[0];
  if (presentation === "latest") {
    return (
      <details className="mb-4">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-teal-800">
          Último resultado confirmado
          {latest.fileName ? <span className="ml-2 break-all font-normal text-slate-600">{latest.fileName}</span> : null}
        </summary>
        <div className="mt-2">
          <ConfirmedResult
            result={latest}
            title="Último resultado confirmado"
            onOpenConfirmedDocument={onOpenConfirmedDocument}
          />
        </div>
      </details>
    );
  }

  const title = uploadState.phase === "confirmed"
    ? "Resultado confirmado"
    : "Último resultado confirmado";
  return (
    <ConfirmedResult
      result={latest}
      title={title}
      onOpenConfirmedDocument={onOpenConfirmedDocument}
    />
  );
}
