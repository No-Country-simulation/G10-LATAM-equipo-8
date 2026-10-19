import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { TriajeDocumento } from "@/types/triaje";
import { triajeService } from "@/services/triajeService";
import { createDocumentUploadController } from "./documentUploadController";

export function useDocumentUpload(
  onConfirmed: (document: TriajeDocumento) => void | Promise<void>,
) {
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  const handledDocumentsRef = useRef(new WeakSet<TriajeDocumento>());
  const [collectionRefreshError, setCollectionRefreshError] = useState<string | null>(null);
  const [controller] = useState(() =>
    createDocumentUploadController({
      uploadFile: (file) =>
        triajeService.subirArchivo(`web-${crypto.randomUUID()}`, "web", file),
    }),
  );

  const uploadState = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const uploadFile = useCallback(
    async (file: File) => {
      const document = await controller.upload(file);
      if (!document || handledDocumentsRef.current.has(document)) return document;

      handledDocumentsRef.current.add(document);
      setCollectionRefreshError(null);
      try {
        await onConfirmedRef.current(document);
      } catch (error) {
        setCollectionRefreshError(
          error instanceof Error ? error.message : "No se pudo actualizar la lista",
        );
      }
      return document;
    },
    [controller],
  );

  const visibleUploadState =
    collectionRefreshError === null
      ? uploadState
      : { ...uploadState, collectionRefreshError };

  return { uploadState: visibleUploadState, uploadFile };
}
