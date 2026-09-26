import type { TriajeDocumento } from "@/types/triaje";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface Props {
  cases: TriajeDocumento[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function CriticalCasesQueue({cases, onApprove, onReject}: Props) {
  const criticalCases = cases.filter(
    (item) => item.decision_enrutamiento.requiere_auditoria_humana,
  );
  return (
    // Contenedor principal
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <h1 className="text-lg font-bold pb-3">Revisión de casos Críticos</h1>
      {/* Versión mobile */}
      <div className="flex flex-col gap-8 md:hidden">
        {criticalCases.map((item) => {
          const { documento_id, fecha_ingesta, datos_extraidos } = item;
          const { paciente, motivo_alerta } = datos_extraidos;
          return (
            <Card key={documento_id}>
              <CardContent>
                <p>
                  <strong>Paciente:</strong> {documento_id} | {paciente.nombre}
                </p>
                <p>
                  <strong>Fecha:</strong> {fecha_ingesta}
                </p>
                <p>
                  <strong>Motivo:</strong> {motivo_alerta}
                </p>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button size="sm" className="flex-1" onClick={() => onApprove(documento_id)}>
                  Aprobar
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => onReject(documento_id)}>
                  Rechazar
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {/* Version de escritorio */}
      <div className="hidden md:block">
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
            {criticalCases.map((item) => {
              const { documento_id, fecha_ingesta, datos_extraidos } = item;
              const { paciente, motivo_alerta } = datos_extraidos;
              return (
                <TableRow key={documento_id}>
                  <TableCell>{documento_id}</TableCell>
                  <TableCell>{paciente.nombre}</TableCell>
                  <TableCell>{fecha_ingesta}</TableCell>
                  <TableCell>{motivo_alerta}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" onClick={() => onApprove(documento_id)}>Aprobar</Button>
                    <Button size="sm" variant="destructive" onClick={() => onReject(documento_id)}>
                      Rechazar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
