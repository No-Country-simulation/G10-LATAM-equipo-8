const reviewStatusLabels: Readonly<Record<string, string>> = {
  PROCESSED: "Procesado",
  NEEDS_AUDIT: "Necesita Auditoria",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const processingStatusLabels: Readonly<Record<string, string>> = {
  PENDING: "Pendiente",
  PROCESSING: "En procesamiento",
  SUCCEEDED: "Procesamiento finalizado",
  FAILED: "Procesamiento fallido",
};

const auditReasonLabels: Readonly<Record<string, string>> = {
  UNVERIFIED_BINARY_EVIDENCE: "Evidencia del archivo sin verificar",
  GEMINI_REQUIRES_HUMAN_REVIEW: "Gemini requiere revisión humana",
};

function labelOrCode(
  value: string,
  labels: Readonly<Record<string, string>>,
): string {
  return Object.prototype.hasOwnProperty.call(labels, value)
    ? labels[value] ?? value
    : value;
}

export function reviewStatusLabel(status: string): string {
  return labelOrCode(status, reviewStatusLabels);
}

export function processingStatusLabel(status: string): string {
  return labelOrCode(status, processingStatusLabels);
}

export function statusTransitionLabel(
  previousStatus: string,
  newStatus: string,
): string {
  return `${reviewStatusLabel(previousStatus)} -> ${reviewStatusLabel(newStatus)}`;
}

export function auditReasonLabel(reason: string): string {
  return labelOrCode(reason, auditReasonLabels);
}
