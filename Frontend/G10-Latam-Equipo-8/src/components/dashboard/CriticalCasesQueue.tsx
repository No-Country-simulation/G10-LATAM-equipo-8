import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function CriticalCasesQueue() {
  const patients = [
    {
      id: "DOC-001",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-002",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-003",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-004",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-005",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-006",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-007",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-008",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-009",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-010",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-011",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-012",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-013",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-014",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-015",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
    {
      id: "DOC-016",
      patient: "L.Fernandez",
      date: "27-10-2026",
      alert: "Dosis Ambigua",
    },
  ];
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <Table className="bg-white border-solid rounded-lg">
        <TableHeader>
          <TableRow>
            <TableHead>ID Documento</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Motivo de Alerta</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>{patient.id}</TableCell>
              <TableCell>{patient.patient}</TableCell>
              <TableCell>{patient.date}</TableCell>
              <TableCell>{patient.alert}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm">Aprobar</Button>
                <Button size="sm" variant="destructive" className="">Rechazar</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
