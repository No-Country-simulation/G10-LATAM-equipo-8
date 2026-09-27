import type { TriajeDocumento } from "@/types/triaje";
import { CloudUpload, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  onUpload: (documento: TriajeDocumento) => void;
}

export function DocumentUpload({ onUpload }: Props) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setIsProcessing(true);
      setTimeout(() => {
        const nuevoDoc: TriajeDocumento = {
          documento_id: "DOC-CLIN-2026-005",
          status: "pendiente_revision",
          fecha_ingesta: "2026-10-27",
          clasificacion: {
            tipo_documento: "Receta Médica",
            especialidad: "Medicina General",
            nivel_prioridad: "Media",
            score_confianza_clasificacion: 0.68,
          },
          datos_extraidos: {
            paciente: { nombre: "Laura Fernández", edad: 34 },
            medico_solicitante: {
              nombre: "Dr. Roberto Gómez",
              matricula: "MN-48291",
            },
            diagnostico_principal: "Faringitis Aguda",
            cie10_sugerido: "J02.9",
            motivo_alerta:
              "Dosis Ambigua - Amoxicilina 1000g en lugar de 1000mg",
          },
          decision_enrutamiento: {
            destino_principal: "Cola_Revision_Humana",
            requiere_auditoria_humana: true,
            justificacion_enrutamiento:
              "Prescripción con dosis 1000 veces superior al límite seguro. Requiere confirmación facultativa.",
          },
          almacenamiento_oci: {
            bucket: "mediflow-documentos-clinicos",
            ruta_objeto: "auditoria_humana/DOC-CLIN-2026-001.json",
            status_backup: "exito",
          },
        };
        onUpload(nuevoDoc);
        setIsProcessing(false);
      }, 1500);
    }
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  return (
    <label
      htmlFor="file-upload"
      className="cursor-pointer flex flex-col items-center justify-center gap-2 p-2 my-2 bg-gray-200 text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg hover:bg-muted/50 hover:border-primary/60 active:scale-95 active:bg-gray-300 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all duration-200"
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />
      {isProcessing ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h3 className="font-bold">Analizando documento con IA...</h3>
          <p className="font-extralight text-sm">{selectedFileName}</p>
        </>
      ) : (
        <>
          <CloudUpload></CloudUpload>
          <h3 className="font-bold">Carga de Nuevos Documentos</h3>
          <p className="font-extralight">Arrastra PDF's, imágenes o texto</p>
        </>
      )}
    </label>
  );
}
