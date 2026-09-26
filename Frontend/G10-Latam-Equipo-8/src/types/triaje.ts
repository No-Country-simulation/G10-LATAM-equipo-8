// Entidades base tipos
export type NivelPrioridad = "Urgente" | "Media" | "Baja";

export type StatusTriaje =
  | "procesado"
  | "pendiente_revision"
  | "aprobado"
  | "rechazado";

// Sub interfaces
export interface Paciente {
  nombre: string;
  edad: number;
}

export interface MedicoSolicitante {
  nombre: string;
  matricula: string;
}

export interface ClasificacionDocumento {
  tipo_documento: string;
  especialidad: string;
  nivel_prioridad: NivelPrioridad;
  score_confianza_clasificacion: number;
}

// Contrato Backend
export interface DatosExtraidos {
  paciente: Paciente;
  medico_solicitante: MedicoSolicitante;
  diagnostico_principal: string;
  cie10_sugerido: string;
  estudio_realizado?: string;
  motivo_alerta?: string;
}

export interface DecisionEnrutamiento {
  destino_principal: string;
  requiere_auditoria_humana: boolean;
  justificacion_enrutamiento: string;
}

export interface AlmacenamientoOCI {
  bucket: string;
  ruta_objeto: string;
  status_backup: "exito" | "pendiente" | "fallo";
}

export interface TriajeDocumento {
  documento_id: string;
  status: StatusTriaje;
  fecha_ingesta: string;
  clasificacion: ClasificacionDocumento;
  datos_extraidos: DatosExtraidos;
  decision_enrutamiento: DecisionEnrutamiento;
  almacenamiento_oci: AlmacenamientoOCI;
}
