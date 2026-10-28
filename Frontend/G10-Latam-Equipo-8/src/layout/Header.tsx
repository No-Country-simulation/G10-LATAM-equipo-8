import { useState } from "react";
import { Menu, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { useTheme } from "@/theme/theme-context";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DashboardView } from "@/types/navigation";
import type { TriajeServiceProvenance } from "@/services/triajeServiceCore";
import { Sidebar } from "./Sidebar";

interface Props {
  pageTitle: string;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  auditPendingCount: number | null;
  urgentAlertCount: number | null;
  allDocumentsCount?: number | null;
  provenance: TriajeServiceProvenance;
}

export function Header({
  pageTitle,
  activeView,
  onViewChange,
  auditPendingCount,
  urgentAlertCount,
  allDocumentsCount = null,
  provenance,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const provenanceLabel = provenance === "demo" ? "Datos ficticios" : "Modo API";

  const changeMobileView = (view: DashboardView) => {
    onViewChange(view);
    setMenuOpen(false);
  };

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Abrir navegación"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <div className="flex justify-end p-2">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11"
                    aria-label="Cerrar navegación"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </Button>
                </SheetClose>
              </div>
              <Sidebar
                activeView={activeView}
                onViewChange={changeMobileView}
                auditPendingCount={auditPendingCount}
                urgentAlertCount={urgentAlertCount}
                allDocumentsCount={allDocumentsCount}
              />
            </SheetContent>
          </Sheet>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
            Triaje documental
          </p>
          <p className="truncate text-xs text-muted-foreground lg:hidden">{pageTitle}</p>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <ThemeSelector theme={theme} onThemeChange={setTheme} />
        <span className="shrink-0 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-slate-700 dark:text-foreground sm:text-sm">
          {provenanceLabel}
        </span>
      </div>
    </header>
  );
}
