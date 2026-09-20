import { Files, TriangleAlert, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  icon: LucideIcon;
  count: number;
};

const DocumentCount = () => {
  const documentAlerts: Props[] = [
    { title: "Total Documentos", icon: Files, count: 24150 },
    { title: "Alertas Críticas", icon: TriangleAlert, count: 32 },
  ];
  return (
    <div className="w-full">
      <nav className="flex gap-4">
        {documentAlerts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              className="flex flex-col justify-between p-4 flex-1 rounded-xl bg-white border"
            >
              <div className="flex items-center justify-between">
                <span>{item.title}</span>
                <Icon className="size-5 shrink-0" />
              </div>
              <span className="text-2xl font-bold text-left">{item.count}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DocumentCount;
