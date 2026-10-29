import type { ChangeEvent } from "react";
import type { DocumentUploadSnapshot } from "@/hooks/documentUploadController";

interface Props {
  uploadState: DocumentUploadSnapshot;
  onFileSelected: (file: File) => void;
}

export function DocumentUpload({ uploadState, onFileSelected }: Props) {
  const isUploading = uploadState.phase === "uploading";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file) onFileSelected(file);
    input.value = "";
  };

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-4">
      <header>
        <h2 id="upload-title" className="text-2xl font-semibold text-foreground">
          Cargar documentos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona un archivo para enviarlo al servicio configurado.
        </p>
      </header>
      <label
        htmlFor="document-upload"
        className={`inline-flex min-h-11 w-fit items-center justify-center rounded-lg border px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-teal-700 focus-within:ring-offset-2 ${
          isUploading
            ? "cursor-not-allowed border-border bg-muted text-slate-500 dark:text-slate-400"
            : "cursor-pointer border-teal-700 bg-teal-700 text-white hover:bg-teal-800"
        }`}
      >
        <input
          id="document-upload"
          type="file"
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          aria-describedby="upload-formats"
          disabled={isUploading}
          onChange={handleFileChange}
        />
        <span>{isUploading ? "Carga en curso" : "Seleccionar archivo"}</span>
      </label>
      <p id="upload-formats" className="text-sm text-muted-foreground">
        Formatos admitidos: PDF, PNG, JPG y JPEG. El límite de tamaño lo valida el servicio.
      </p>
    </section>
  );
}
