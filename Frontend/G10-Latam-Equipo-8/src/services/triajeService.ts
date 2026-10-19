import {
  mockColaAuditoriaConLatencia,
  mockHistorialConLatencia,
  revisionDocumento,
} from "@/mocks/triaje";
import { resolveApiBaseUrl } from "./apiConfig";
import { createTriajeService } from "./triajeServiceCore";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env);

export const triajeService = createTriajeService({
  apiBaseUrl: API_BASE_URL,
  mock: {
    getHistory: mockHistorialConLatencia,
    getAuditQueue: ({ offset = 0, limit = 20 }) =>
      mockColaAuditoriaConLatencia(offset, limit),
    review: revisionDocumento,
  },
});
