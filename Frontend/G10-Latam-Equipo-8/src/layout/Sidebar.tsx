import { House, Files, TriangleAlert, type LucideIcon } from "lucide-react";
import logoMediflow from "@/assets/mediflow-logo.jpg";
import type { DashboardView } from "@/types/navigation";

type NavItem = {
  label: string;
  icon: LucideIcon;
  target: DashboardView;
  activeWhen?: DashboardView;
  badge?: number;
};

type Props = {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  criticalAlertsCount: number;
};

export const Sidebar = ({
  activeView,
  onViewChange,
  criticalAlertsCount,
}: Props) => {
  const navItems: NavItem[] = [
    {
      label: "Inicio",
      icon: House,
      target: "dashboard",
      activeWhen: "dashboard",
    },
    {
      label: "Todos los documentos",
      icon: Files,
      target: "history",
      activeWhen: "history",
    },
    { label: "Ingesta de Documentos", icon: Files, target: "dashboard" },
    {
      label: "Revision pendiente (HITL)",
      icon: TriangleAlert,
      target: "dashboard",
      badge: criticalAlertsCount,
    },
  ];

  return (
    <aside className="w-64 h-screen p-4 flex flex-col gap-2 border">
      <header>
        <img src={logoMediflow} alt="Logo MediFlow" />
      </header>
      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeWhen === activeView;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onViewChange(item.target)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted hover:text-foreground ${
                isActive ? "bg-muted text-foreground" : ""
              }`}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto" aria-label={`${item.badge} alertas críticas`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
