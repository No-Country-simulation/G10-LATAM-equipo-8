import type {
  CorreccionesRevision,
  NivelPrioridad,
  TriajeDocumento,
} from "../../types/triaje";

export interface ReviewDraft {
  patientName: string;
  patientAge: string;
  documentType: string;
  priority: NivelPrioridad | "";
  referringDoctorName: string;
  referringDoctorRegistration: string;
  study: string;
  indication: string;
  diagnosis: string;
  suggestedCIE10: string;
  ageExplicitlyCleared: boolean;
}

export type ReviewDraftTextField = Exclude<keyof ReviewDraft, "ageExplicitlyCleared">;

export interface ReviewFieldPresentation {
  key: ReviewDraftTextField;
  label: string;
  originalValue: string;
  proposedValue: string;
  persistence: "correction" | "local-only";
}

export interface ReadOnlyFieldPresentation {
  label: string;
  value: string;
}

export interface ReviewPresentation {
  patient: {
    name: ReviewFieldPresentation;
    age: ReviewFieldPresentation;
  };
  referringDoctor: {
    name: ReviewFieldPresentation;
    registration: ReviewFieldPresentation;
  };
  study: {
    performed: ReviewFieldPresentation;
    indication: ReviewFieldPresentation;
    diagnosis: ReviewFieldPresentation;
    suggestedCIE10: ReviewFieldPresentation;
  };
  classification: {
    documentType: ReviewFieldPresentation;
    priority: ReviewFieldPresentation;
  };
  readOnly: {
    system: ReadOnlyFieldPresentation[];
    processing: ReadOnlyFieldPresentation[];
    routing: ReadOnlyFieldPresentation[];
    storage: ReadOnlyFieldPresentation[];
    confidenceScore: ReadOnlyFieldPresentation;
    specialty: ReadOnlyFieldPresentation;
    provenance: ReadOnlyFieldPresentation[];
    extractionEvidence: Array<{
      field: string;
      page: string;
      quote: string;
    }>;
  };
  auditReasons: string[];
  processingError: string | null;
}

export type ReviewEligibility =
  | {
      state: "ready";
      editable: true;
      heading: "Revisión disponible";
      priorityLabel: string;
    }
  | {
      state: "failed";
      editable: false;
      heading: "Revisar procesamiento";
      priorityLabel: string;
    }
  | {
      state: "processing";
      editable: false;
      heading: "Procesamiento pendiente";
      priorityLabel: string;
    }
  | {
      state: "readonly";
      editable: false;
      heading: "Solo lectura";
      priorityLabel: string;
    };

const editableFields: ReviewDraftTextField[] = [
  "patientName",
  "patientAge",
  "documentType",
  "priority",
  "referringDoctorName",
  "referringDoctorRegistration",
  "study",
  "indication",
  "diagnosis",
  "suggestedCIE10",
];

function draftText(value: string | number | null): string {
  return value === null ? "" : String(value);
}

export function displayReviewValue(value: unknown): string {
  if (value === null || value === undefined) return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function displayPriority(value: NivelPrioridad | null): string {
  if (value === "Rutina") return "Rutinaria";
  if (value === "Urgente") return "Urgente";
  return "Sin evaluar";
}

export function createReviewDraft(document: TriajeDocumento): ReviewDraft {
  const doctor = document.datos_extraidos.medico_solicitante;
  return {
    patientName: draftText(document.datos_extraidos.paciente.nombre),
    patientAge: draftText(document.datos_extraidos.paciente.edad),
    documentType: draftText(document.clasificacion.tipo_documento),
    priority: document.clasificacion.nivel_prioridad ?? "",
    referringDoctorName: draftText(doctor?.nombre ?? null),
    referringDoctorRegistration: draftText(doctor?.matricula ?? null),
    study: draftText(document.datos_extraidos.estudio_realizado),
    indication: draftText(document.datos_extraidos.indicacion),
    diagnosis: draftText(document.datos_extraidos.diagnostico_principal),
    suggestedCIE10: draftText(document.datos_extraidos.cie10_sugerido),
    ageExplicitlyCleared: false,
  };
}

export function updateReviewDraft<K extends ReviewDraftTextField>(
  draft: ReviewDraft,
  field: K,
  value: ReviewDraft[K],
): ReviewDraft {
  return {
    ...draft,
    [field]: value,
    ...(field === "patientAge" ? { ageExplicitlyCleared: false } : {}),
  };
}

export function clearAgeProposal(draft: ReviewDraft): ReviewDraft {
  return { ...draft, patientAge: "", ageExplicitlyCleared: true };
}

export function isReviewDraftDirty(
  document: TriajeDocumento,
  draft: ReviewDraft,
): boolean {
  const initial = createReviewDraft(document);
  return (
    editableFields.some((field) => draft[field] !== initial[field]) ||
    (draft.ageExplicitlyCleared && document.datos_extraidos.paciente.edad !== null)
  );
}

function field(
  key: ReviewDraftTextField,
  label: string,
  original: string | number | null,
  proposed: string,
  persistence: ReviewFieldPresentation["persistence"],
  displayOriginal = displayReviewValue(original),
): ReviewFieldPresentation {
  return {
    key,
    label,
    originalValue: displayOriginal,
    proposedValue: proposed,
    persistence,
  };
}

function readonlyField(label: string, value: unknown): ReadOnlyFieldPresentation {
  return { label, value: displayReviewValue(value) };
}

export function presentReviewDocument(
  document: TriajeDocumento,
  draft: ReviewDraft,
): ReviewPresentation {
  const data = document.datos_extraidos;
  const classification = document.clasificacion;
  const routing = document.decision_enrutamiento;
  const doctor = data.medico_solicitante;
  const priorityLabel = displayPriority(classification.nivel_prioridad);

  return {
    patient: {
      name: field(
        "patientName",
        "Nombre del paciente",
        data.paciente.nombre,
        draft.patientName,
        "correction",
      ),
      age: field(
        "patientAge",
        "Edad",
        data.paciente.edad,
        draft.patientAge,
        "correction",
      ),
    },
    referringDoctor: {
      name: field(
        "referringDoctorName",
        "Nombre del médico referente",
        doctor?.nombre ?? null,
        draft.referringDoctorName,
        "local-only",
      ),
      registration: field(
        "referringDoctorRegistration",
        "Matrícula del médico referente",
        doctor?.matricula ?? null,
        draft.referringDoctorRegistration,
        "local-only",
      ),
    },
    study: {
      performed: field(
        "study",
        "Estudio realizado",
        data.estudio_realizado,
        draft.study,
        "local-only",
      ),
      indication: field(
        "indication",
        "Indicación",
        data.indicacion,
        draft.indication,
        "local-only",
      ),
      diagnosis: field(
        "diagnosis",
        "Diagnóstico principal",
        data.diagnostico_principal,
        draft.diagnosis,
        "local-only",
      ),
      suggestedCIE10: field(
        "suggestedCIE10",
        "CIE-10 sugerido",
        data.cie10_sugerido,
        draft.suggestedCIE10,
        "local-only",
      ),
    },
    classification: {
      documentType: field(
        "documentType",
        "Tipo de documento",
        classification.tipo_documento,
        draft.documentType,
        "correction",
      ),
      priority: field(
        "priority",
        "Prioridad clínica",
        classification.nivel_prioridad,
        draft.priority,
        "correction",
        priorityLabel,
      ),
    },
    readOnly: {
      system: [
        readonlyField("ID del documento", document.documento_id),
        readonlyField("Canal de ingreso", document.canal_origen),
        readonlyField("Fecha de ingreso (UTC)", document.created_at),
        readonlyField("Estado de revisión", document.status),
      ],
      processing: [
        readonlyField("Estado del procesamiento", document.processing_status),
        readonlyField("Modo de IA declarado", document.modo_ia),
      ],
      routing: [
        readonlyField("Destino registrado", routing.destino_principal),
        readonlyField(
          "Requiere auditoría humana",
          routing.requiere_auditoria_humana,
        ),
        readonlyField(
          "Justificación del enrutamiento",
          routing.justificacion_enrutamiento,
        ),
        readonlyField("Alerta urgente", routing.alerta_urgente),
        readonlyField("Notificación generada", routing.notificacion_generada),
      ],
      storage: [
        readonlyField("Proveedor de almacenamiento", document.almacenamiento.proveedor),
        readonlyField("Clave interna de almacenamiento", document.almacenamiento.ruta_objeto),
        readonlyField("Estado del respaldo", document.almacenamiento.status_backup),
        readonlyField("Almacenamiento OCI", document.almacenamiento_oci),
      ],
      confidenceScore: readonlyField(
        "Puntaje declarado; no es precisión clínica",
        classification.score_confianza_clasificacion,
      ),
      specialty: readonlyField("Especialidad (reservada)", classification.especialidad),
      provenance: [
        readonlyField("Tipo de confianza declarado", document.confianza_tipo),
        readonlyField(
          "Versión del esquema de extracción",
          document.extraction_schema_version,
        ),
        readonlyField("Proveedor de extracción", document.extraction_provenance.provider),
        readonlyField("Modelo declarado", document.extraction_provenance.model),
        readonlyField(
          "Versión del prompt declarada",
          document.extraction_provenance.prompt_version,
        ),
      ],
      extractionEvidence: document.extraction_evidence.map((evidence) => ({
        field: evidence.field,
        page: displayReviewValue(evidence.page),
        quote: displayReviewValue(evidence.quote),
      })),
    },
    auditReasons: [...document.audit_reasons],
    processingError: document.processing_error,
  };
}

export function reviewEligibility(document: TriajeDocumento): ReviewEligibility {
  const priorityLabel = displayPriority(document.clasificacion.nivel_prioridad);

  if (document.status === "APPROVED" || document.status === "REJECTED") {
    return {
      state: "readonly",
      editable: false,
      heading: "Solo lectura",
      priorityLabel,
    };
  }
  if (document.processing_status === "FAILED") {
    return {
      state: "failed",
      editable: false,
      heading: "Revisar procesamiento",
      priorityLabel,
    };
  }
  if (
    document.processing_status === "PENDING" ||
    document.processing_status === "PROCESSING"
  ) {
    return {
      state: "processing",
      editable: false,
      heading: "Procesamiento pendiente",
      priorityLabel,
    };
  }
  if (document.status !== "NEEDS_AUDIT") {
    return {
      state: "readonly",
      editable: false,
      heading: "Solo lectura",
      priorityLabel,
    };
  }
  return {
    state: "ready",
    editable: true,
    heading: "Revisión disponible",
    priorityLabel,
  };
}

export function buildCorrectionProposal(
  document: TriajeDocumento,
  draft: ReviewDraft,
): CorreccionesRevision {
  const corrections: CorreccionesRevision = {};
  const patient = document.datos_extraidos.paciente;

  if (
    draft.patientName !== "" &&
    draft.patientName !== patient.nombre
  ) {
    corrections.nombre_paciente = draft.patientName;
  }

  if (draft.ageExplicitlyCleared) {
    if (patient.edad !== null) corrections.edad_paciente = null;
  } else if (draft.patientAge !== "") {
    const proposedAge = Number(draft.patientAge);
    if (
      Number.isInteger(proposedAge) &&
      proposedAge >= 0 &&
      proposedAge <= 130 &&
      proposedAge !== patient.edad
    ) {
      corrections.edad_paciente = proposedAge;
    }
  }

  if (
    draft.documentType !== "" &&
    draft.documentType !== document.clasificacion.tipo_documento
  ) {
    corrections.tipo_documento = draft.documentType;
  }

  if (
    draft.priority !== "" &&
    draft.priority !== document.clasificacion.nivel_prioridad
  ) {
    corrections.nivel_prioridad = draft.priority;
  }

  return corrections;
}
