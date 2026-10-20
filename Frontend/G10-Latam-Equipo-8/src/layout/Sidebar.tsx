import {
  ClipboardList,
  FilePlus2,
  Files,
  TriangleAlert,
  type IconComponent,
} from "@/components/ui/icons";
import logoMediflow from "@/assets/mediflow-logo.jpg";
import {
  DASHBOARD_DESTINATIONS,
  isActiveDashboardView,
  type DashboardView,
} from "@/types/navigation";

type NavItem = {
  label: string;
  icon: IconComponent;
  target: DashboardView;
  count: number | null;
  countDescription: (count: number) => string;
};

interface Props {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  auditPendingCount: number | null;
  urgentAlertCount: number | null;
}

const destinationIcons: Record<DashboardView, IconComponent> = {
  upload: FilePlus2,
  pending: ClipboardList,
  all: Files,
  alerts: TriangleAlert,
};

export function Sidebar({
  activeView,
  onViewChange,
  auditPendingCount,
  urgentAlertCount,
}: Props) {
  const navItems: NavItem[] = DASHBOARD_DESTINATIONS.map(({ view, label }) => {
    if (view === "pending") {
      return {
        label,
        icon: destinationIcons[view],
        target: view,
        count: auditPendingCount,
        countDescription: (count) => `${count} pendientes de auditoría`,
      };
    }
    if (view === "alerts") {
      return {
        label,
        icon: destinationIcons[view],
        target: view,
        count: urgentAlertCount,
        countDescription: (count) =>
          `${count} alertas urgentes en la página de historial cargada`,
      };
    }
    return {
      label,
      icon: destinationIcons[view],
      target: view,
      count: null,
      countDescription: () => "",
    };
  });

  return (
    <aside className="flex min-h-full w-54 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white p-4">
      <header className="flex min-h-11 items-center px-2">
        <img
          src={logoMediflow}
          alt="MediFlow"
          className="h-10 w-auto object-contain"
        />
      </header>
      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveDashboardView(activeView, item.target);
          return (
            <button
              key={item.target}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onViewChange(item.target)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                isActive
                  ? "bg-teal-50 font-medium text-teal-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span>{item.label}</span>
              {item.count !== null && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    {item.count}
                  </span>
                  <span className="sr-only">{item.countDescription(item.count)}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
