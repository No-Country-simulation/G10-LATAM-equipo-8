import type { DashboardView } from "@/types/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type Props = {
  children: React.ReactNode;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  criticalAlertsCount: number;
};

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  criticalAlertsCount,
}: Props) {
  const title =
    activeView === "history"
      ? "Todos los documentos"
      : "Mediflow - Administración de Documentación Médica";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          onViewChange={onViewChange}
          criticalAlertsCount={criticalAlertsCount}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <Header
          title={title}
          activeView={activeView}
          onViewChange={onViewChange}
          criticalAlertsCount={criticalAlertsCount}
        />
        <main className="flex-1 flex flex-col min-h-0 gap-4 p-2 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
