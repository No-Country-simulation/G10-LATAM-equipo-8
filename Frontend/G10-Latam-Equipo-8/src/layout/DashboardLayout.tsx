import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <Header title="Mediflow - Administración de Documentación Médica"></Header>
        <main className="flex-1 flex flex-col min-h-0 gap-4 p-2 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
