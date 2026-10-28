import type { DocumentUploadSnapshot } from "@/hooks/documentUploadController";
import { UploadResults, type UploadResultPresentation } from "./UploadResults";
import type { TriajeDocumento } from "@/types/triaje";

interface Props {
  uploadState: DocumentUploadSnapshot;
  onOpenConfirmedDocument?: (document: TriajeDocumento) => void;
  resultPresentation?: UploadResultPresentation;
}

export function UploadStatus({
  uploadState,
  onOpenConfirmedDocument,
  resultPresentation = "legacy",
}: Props) {
  const hasStatus =
    uploadState.phase === "uploading" ||
    uploadState.phase === "failed" ||
    uploadState.collectionRefreshError !== null;

  return (
    <>
      {hasStatus && (
        <section
          aria-labelledby="upload-status-title"
          className="mb-4 rounded-lg border border-border bg-card p-4"
        >
          <h2 id="upload-status-title" className="sr-only">
            Estado de carga
          </h2>
          {uploadState.phase === "uploading" && (
            <div role="status" aria-live="polite" className="text-sm text-slate-700 dark:text-slate-300">
              <p className="font-semibold">Cargando…</p>
              <p className="mt-1 break-all">{uploadState.fileName}</p>
              <p className="mt-1 text-muted-foreground">
                La solicitud sigue activa aunque cambies de destino.
              </p>
            </div>
          )}
          {uploadState.phase === "failed" && (
            <div role="alert" aria-live="assertive" className="text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold">No se pudo cargar {uploadState.fileName}.</p>
              <p className="mt-1 wrap-break-word">{uploadState.error}</p>
            </div>
          )}
          {uploadState.collectionRefreshError && (
            <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              El documento quedó registrado, pero no se pudo actualizar la lista: {uploadState.collectionRefreshError}
            </p>
          )}
        </section>
      )}
      <UploadResults
        uploadState={uploadState}
        presentation={resultPresentation}
        onOpenConfirmedDocument={onOpenConfirmedDocument}
      />
    </>
  );
}
