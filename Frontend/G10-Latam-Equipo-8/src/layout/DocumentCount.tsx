import { Files, TriangleAlert, type LucideIcon } from "lucide-react";

type Props = {
    title: string;
    icon: LucideIcon;
    count: number;
};

const DocumentCount = () => {
    const documentAlerts: Props[] = [
        {title: "Total Documentos", icon: Files, count: 24150},
        {title: "Alertas Críticas", icon: TriangleAlert, count: 32}
    ]
  return (
    <div className="w-full h-24">
        <nav className="flex justify-between p-4">
            {documentAlerts.map((item) => {
                const Icon = item.icon;
                return (
                    <button key={item.title} className="p-2 bg-white rounded-md ">
                        <Icon className="size-5 shrink-0" />
                        <span>{item.title}</span>
                    </button>
                )
            })}
        </nav>
    </div>
  );
}

export default DocumentCount;
