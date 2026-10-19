export const DASHBOARD_DESTINATIONS = [
  { view: "upload", label: "Cargar documentos" },
  { view: "pending", label: "Pendientes" },
  { view: "all", label: "Todos los documentos" },
  { view: "alerts", label: "Alertas inmediatas" },
] as const;

export type DashboardView = (typeof DASHBOARD_DESTINATIONS)[number]["view"];

export function isActiveDashboardView(
  activeView: DashboardView,
  candidateView: DashboardView,
): boolean {
  return activeView === candidateView;
}
