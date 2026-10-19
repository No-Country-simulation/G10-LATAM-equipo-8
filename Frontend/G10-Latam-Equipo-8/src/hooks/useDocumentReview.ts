import { useEffect, useState } from "react";
import type {
  DocumentoOriginal,
  ReviewEventResponse,
  TriajeDocumento,
} from "../types/triaje";

export type ReviewResource<T> =
  | { status: "loading" }
  | { status: "loaded"; value: T }
  | { status: "error"; error: string };

export type DocumentReviewProvenance = "api" | "demo" | null;

export interface DocumentReviewResources {
  documentId: string;
  provenance: DocumentReviewProvenance;
  detail: ReviewResource<TriajeDocumento>;
  original: ReviewResource<DocumentoOriginal>;
  reviews: ReviewResource<ReviewEventResponse[]>;
}

export interface DocumentReviewService {
  provenance?: Exclude<DocumentReviewProvenance, null>;
  getDetalleTriaje(documentId: string): Promise<TriajeDocumento>;
  getDocumentoOriginal(documentId: string): Promise<DocumentoOriginal>;
  getRevisiones(documentId: string): Promise<ReviewEventResponse[]>;
}

export function initialDocumentReviewResources(
  documentId: string,
): DocumentReviewResources {
  return {
    documentId,
    provenance: null,
    detail: { status: "loading" },
    original: { status: "loading" },
    reviews: { status: "loading" },
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "No se pudo completar esta solicitud.";
}

export function startDocumentReviewLoad(
  documentId: string,
  service: DocumentReviewService,
  onChange: (resources: DocumentReviewResources) => void,
): () => void {
  let active = true;
  let resources = {
    ...initialDocumentReviewResources(documentId),
    provenance: service.provenance ?? null,
  };

  const publishDetail = (detail: ReviewResource<TriajeDocumento>) => {
    if (!active) return;
    resources = { ...resources, detail };
    onChange(resources);
  };
  const publishOriginal = (original: ReviewResource<DocumentoOriginal>) => {
    if (!active) return;
    resources = { ...resources, original };
    onChange(resources);
  };
  const publishReviews = (reviews: ReviewResource<ReviewEventResponse[]>) => {
    if (!active) return;
    resources = { ...resources, reviews };
    onChange(resources);
  };

  const load = <T,>(
    request: () => Promise<T>,
    publish: (resource: ReviewResource<T>) => void,
  ) => {
    let result: Promise<T>;
    try {
      result = request();
    } catch (error) {
      publish({ status: "error", error: errorMessage(error) });
      return;
    }
    void Promise.resolve(result).then(
      (value) => publish({ status: "loaded", value }),
      (error: unknown) =>
        publish({ status: "error", error: errorMessage(error) }),
    );
  };

  load(() => service.getDetalleTriaje(documentId), publishDetail);
  load(() => service.getDocumentoOriginal(documentId), publishOriginal);
  load(() => service.getRevisiones(documentId), publishReviews);

  return () => {
    active = false;
  };
}

export type OriginalPreviewKind = "pdf" | "image";

export function getOriginalPreviewKind(
  contentType: string | null,
): OriginalPreviewKind | null {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType === "application/pdf") return "pdf";
  if (mediaType === "image/png" || mediaType === "image/jpeg") return "image";
  return null;
}

export interface OriginalObjectUrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export interface OriginalPreviewLease {
  kind: OriginalPreviewKind | null;
  url: string | null;
  dispose: () => void;
}

export function createOriginalPreviewLease(
  original: DocumentoOriginal,
  objectUrls: OriginalObjectUrlApi = URL,
): OriginalPreviewLease {
  const kind = getOriginalPreviewKind(original.contentType);
  const blobKind = getOriginalPreviewKind(original.blob.type);
  if (!kind || blobKind !== kind) {
    return { kind: null, url: null, dispose: () => {} };
  }

  const url = objectUrls.createObjectURL(original.blob);
  let disposed = false;
  return {
    kind,
    url,
    dispose() {
      if (disposed) return;
      disposed = true;
      objectUrls.revokeObjectURL(url);
    },
  };
}

export function useDocumentReview(documentId: string): DocumentReviewResources {
  const [resources, setResources] = useState(() =>
    initialDocumentReviewResources(documentId),
  );

  useEffect(() => {
    let active = true;
    let cancelLoad = () => {};

    void import("../services/triajeService")
      .then(({ triajeService }) => {
        if (!active) return;
        setResources({
          ...initialDocumentReviewResources(documentId),
          provenance: triajeService.provenance,
        });
        cancelLoad = startDocumentReviewLoad(
          documentId,
          triajeService,
          setResources,
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = errorMessage(error);
        setResources({
          documentId,
          provenance: null,
          detail: { status: "error", error: message },
          original: { status: "error", error: message },
          reviews: { status: "error", error: message },
        });
      });

    return () => {
      active = false;
      cancelLoad();
    };
  }, [documentId]);

  return resources.documentId === documentId
    ? resources
    : initialDocumentReviewResources(documentId);
}
