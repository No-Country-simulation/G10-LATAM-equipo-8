import type { TriajeDocumento } from "@/types/triaje";
import { mockTriajesConLatencia, revisionDocumento } from "@/mocks/triaje";
import type { AccionRevision } from "@/types/triaje"

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
  revisarDocumento: async (
    documento_id: string,
    accion: AccionRevision,
  ): Promise<TriajeDocumento> => {
    if (!API_BASE_URL) {
      return revisionDocumento(documento_id, accion);
    }
    const response = await fetch(
      `${API_BASE_URL}/triajes/${documento_id}/revision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Error al reivsar ${documento_id}: ${response.statusText}`,
      );
    }
    return response.json();
  },
};
