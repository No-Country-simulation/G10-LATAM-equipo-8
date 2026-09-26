import { House, Files, TriangleAlert, type LucideIcon } from "lucide-react";
import logoMediflow from "@/assets/mediflow-logo.jpg"

type NavItem = {
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export const Sidebar = () => {
  const navItems: NavItem[] = [
    { label: "Inicio", icon: House },
    { label: "Ingesta de Documentos", icon: Files },
    { label: "Revision pendiente (HITL)", icon: TriangleAlert, badge: 32 },
  ];

  return (
    <aside className="w-64 h-screen p-4 flex flex-col gap-2 border">
      <header>
        <img src={logoMediflow} alt="Logo MediFlow" className=""/>
      </header>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
              {item.badge && <span className="ml-auto">{item.badge}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};