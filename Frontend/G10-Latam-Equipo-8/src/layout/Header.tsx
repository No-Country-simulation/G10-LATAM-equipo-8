import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "@/types/navigation";
import { Sidebar } from "./Sidebar";

type Props = {
  title: string;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  criticalAlertsCount: number;
};

export const Header = ({
  title,
  activeView,
  onViewChange,
  criticalAlertsCount,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const changeMobileView = (view: DashboardView) => {
    onViewChange(view);
    setMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <h1 className="hidden md:block text-xl font-bold">{title}</h1>
      <div className="flex items-center justify-between w-full md:hidden">
        <span className="font-bold text-lg">Mediflow - Admin</span>
        <div className="flex items-center gap-2">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir navegación">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <Sidebar
                activeView={activeView}
                onViewChange={changeMobileView}
                criticalAlertsCount={criticalAlertsCount}
              />
            </SheetContent>
          </Sheet>
          <CircleUser className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};
