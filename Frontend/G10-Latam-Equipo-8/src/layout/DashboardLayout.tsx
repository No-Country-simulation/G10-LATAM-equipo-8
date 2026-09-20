import Header from "./Header";
import Sidebar from "./Sidebar";

type Props = {
    children: React.ReactNode
};

function DashboardLayout({children}: Props) {
  return (
    <div className="flex min-h-screen">
      <Sidebar></Sidebar>
      <div className="flex-1 flex flex-col">
        <Header title="Mediflow - Administración de Docmumentación Médica"></Header>
        <main className="flex-1 p-6 bg-gray-100">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
