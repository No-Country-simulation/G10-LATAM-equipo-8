import { useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { TriajeDocumento } from "@/types/triaje";
import { triajeService } from "@/services/triajeService";

interface Props {
  onUpload: (documento: TriajeDocumento) => void;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo cargar el documento";
}

export function DocumentUpload({ onUpload }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setUploadError("");
    setIsProcessing(true);

    try {
      const documento = await triajeService.subirArchivo(
        `web-${crypto.randomUUID()}`,
        "web",
        file,
      );
      onUpload(documento);
    } catch (error) {
      setUploadError(mensajeDeError(error));
    } finally {
      setIsProcessing(false);
      input.value = "";
    }
  };

  return (
    <section className="my-2">
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center justify-center gap-2 p-2 bg-gray-200 text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg hover:bg-muted/50 hover:border-primary/60 active:scale-95 active:bg-gray-300 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all duration-200"
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={isProcessing}
          onChange={(event) => void handleFileChange(event)}
        />
        {isProcessing ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <h3 className="font-bold">Cargando documento…</h3>
            <p className="font-extralight text-sm">{selectedFileName}</p>
          </>
        ) : (
          <>
            <CloudUpload aria-hidden="true" />
            <h3 className="font-bold">Carga de nuevos documentos</h3>
            <p className="font-extralight">Seleccioná un PDF o una imagen JPG/PNG.</p>
          </>
        )}
      </label>
      {uploadError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {uploadError}
        </p>
      )}
    </section>
  );
}
