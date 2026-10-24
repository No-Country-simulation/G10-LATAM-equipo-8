import type { DashboardView } from "@/types/navigation";
import type { TriajeServiceProvenance } from "@/services/triajeServiceCore";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface Props {
  children: React.ReactNode;
  pageTitle: string;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  auditPendingCount: number | null;
  urgentAlertCount: number | null;
  allDocumentsCount?: number | null;
  provenance: TriajeServiceProvenance;
}

export function DashboardLayout({
  children,
  pageTitle,
  activeView,
  onViewChange,
  auditPendingCount,
  urgentAlertCount,
  allDocumentsCount,
  provenance,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen lg:flex-row lg:overflow-hidden">
      <div className="hidden shrink-0 lg:flex">
        <Sidebar
          activeView={activeView}
          onViewChange={onViewChange}
          auditPendingCount={auditPendingCount}
          urgentAlertCount={urgentAlertCount}
          allDocumentsCount={allDocumentsCount}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          pageTitle={pageTitle}
          activeView={activeView}
          onViewChange={onViewChange}
          auditPendingCount={auditPendingCount}
          urgentAlertCount={urgentAlertCount}
          allDocumentsCount={allDocumentsCount}
          provenance={provenance}
        />
        <main
          aria-label={pageTitle}
          tabIndex={-1}
          data-review-collection-focus
          className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:p-6 lg:overflow-y-auto"
        >
          <h1 className="sr-only">{pageTitle}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
