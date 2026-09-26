import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";

type prop = {
  title: string;
};

export const Header = ({ title }: prop) => {
  return (
    <div>
      <header className="flex items-center justify-between p-4 bg-white border-b">
        <h1 className="hidden md:block text-xl font-bold">{title}</h1>
        <div className="flex items-center justify-between w-full md:hidden">
          <span className="font-bold text-lg">Mediflow - Admin</span>
          <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <Sidebar></Sidebar>
            </SheetContent>
          </Sheet>
          <CircleUser className="size-6 text-muted-foreground"></CircleUser>
          </div>
        </div>
      </header>
    </div>
  );
};
