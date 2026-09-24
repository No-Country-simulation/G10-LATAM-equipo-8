import { CloudUpload } from "lucide-react";

export function DocumentUpload() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-2 my-2 bg-gray-200 text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg">
      <CloudUpload></CloudUpload>
      <h3 className="font-bold">Carga de Nuevos Documentos</h3>
      <p className="font-extralight">Arrastra PDF's, imágenes o texto</p>
    </div>
  );
}
