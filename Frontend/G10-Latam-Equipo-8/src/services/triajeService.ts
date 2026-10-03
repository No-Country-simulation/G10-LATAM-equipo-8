import type { TriajeDocumento } from "@/types/triaje";
import { mockTriajesConLatencia } from "@/mocks/triaje";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const triajeService = {
  getTriajes: async (): Promise<TriajeDocumento[]> => {
    if (!API_BASE_URL) {
      const listaDeTriajes = await mockTriajesConLatencia();
      return listaDeTriajes;
    }
    const response = await fetch(`${API_BASE_URL}/triajes`);
    if (!response.ok) {
      throw new Error(`Error al consultar triajes: ${response.statusText}`);
    }
    return response.json();
  },
};