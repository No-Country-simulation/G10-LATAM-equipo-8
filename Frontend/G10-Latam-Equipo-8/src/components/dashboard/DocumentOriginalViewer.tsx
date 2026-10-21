import { useEffect, useState } from "react";
import type { DocumentoOriginal } from "../../types/triaje";
import {
  createOriginalPreviewLease,
  type DocumentReviewProvenance,
  type OriginalPreviewKind,
  type ReviewResource,
} from "../../hooks/useDocumentReview";

interface DocumentOriginalViewerProps {
  documentId: string;
  resource: ReviewResource<DocumentoOriginal>;
  provenance: DocumentReviewProvenance;
}

interface ActivePreview {
  documentId: string;
  blob: Blob;
  kind: OriginalPreviewKind;
  url: string;
}

export function DocumentOriginalViewer({
  documentId,
  resource,
  provenance,
}: DocumentOriginalViewerProps) {
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);

  useEffect(() => {
    if (resource.status !== "loaded") return;

    const lease = createOriginalPreviewLease(resource.value);
    let active = true;
    if (lease.kind && lease.url) {
      queueMicrotask(() => {
        if (!active) return;
        setActivePreview({
          documentId,
          blob: resource.value.blob,
          kind: lease.kind!,
          url: lease.url!,
        });
      });
    } else {
      queueMicrotask(() => {
        if (active) setActivePreview(null);
      });
    }

    return () => {
      active = false;
      lease.dispose();
    };
  }, [documentId, resource]);

  const original = resource.status === "loaded" ? resource.value : null;
  const preview =
    original &&
    activePreview?.documentId === documentId &&
    activePreview.blob === original.blob
      ? activePreview
      : null;

  return (
    <section className="flex min-h-0 flex-col gap-4 p-4 sm:p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Ver documento original
        </h2>
        {resource.status === "loading" ? (
          <p role="status" className="text-sm text-slate-600">
            Cargando bytes del original…
          </p>
        ) : null}
        {resource.status === "error" ? (
          <div role="alert" className="space-y-2 text-sm text-red-800">
            <p>No se pudo cargar el documento original.</p>
            {provenance === "demo" ? (
              <p>
                La muestra JSON de demostración no incluye bytes del documento
                original.
              </p>
            ) : null}
            <p className="wrap-break-word">Detalle de carga: {resource.error}</p>
          </div>
        ) : null}
        {original ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-600">
                Nombre recibido en la respuesta
              </dt>
              <dd className="wrap-break-word text-slate-900">
                {original.filename ?? "No informado en la respuesta"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-600">
                Tipo de contenido recibido
              </dt>
              <dd className="wrap-break-word text-slate-900">
                {original.contentType ?? "No informado en la respuesta"}
              </dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="flex min-h-96 min-w-0 flex-1 items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {resource.status === "loading" ? (
          <p role="status" className="text-sm text-slate-600">
            Esperando la respuesta del original.
          </p>
        ) : null}
        {resource.status === "error" ? (
          <p className="text-center text-sm text-slate-600">
            La vista del original no está disponible. Los datos del documento se
            cargan y muestran por separado.
          </p>
        ) : null}
        {resource.status === "loaded" && !preview ? (
          <p role="status" className="max-w-prose text-center text-sm text-slate-600">
            No se ofrece vista previa para el tipo de contenido recibido.
          </p>
        ) : null}
        {preview?.kind === "pdf" ? (
          <object
            data={preview.url}
            type="application/pdf"
            aria-label={`Vista previa PDF del documento ${documentId}`}
            className="min-h-96 w-full self-stretch"
          >
            <p className="p-4 text-sm text-slate-700">
              El navegador no pudo mostrar el PDF recibido.
            </p>
          </object>
        ) : null}
        {preview?.kind === "image" ? (
          <img
            src={preview.url}
            alt={`Vista previa de imagen del documento ${documentId}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : null}
      </div>
    </section>
  );
}
