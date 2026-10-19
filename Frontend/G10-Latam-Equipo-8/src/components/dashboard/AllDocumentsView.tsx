import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EstadoProcesamiento, StatusTriaje, TriajeDocumento } from "@/types/triaje";
import { resumirPaginacionHistorial } from "./resumenPaginacionHistorial";

interface Props {
  documents: TriajeDocumento[];
  total: number;
  offset: number;
  limit: number;
  isLoading: boolean;
  error: string;
  onPageChange: (offset: number) => Promise<void>;
}

const statusLabels: Record<StatusTriaje, string> = {
  PROCESSED: "Procesado",
  NEEDS_AUDIT: "Revisión pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const processingLabels: Record<EstadoProcesamiento, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  SUCCEEDED: "Finalizado",
  FAILED: "Fallido",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "No disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusVariant(
  status: StatusTriaje,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "NEEDS_AUDIT" || status === "REJECTED") return "destructive";
  if (status === "PROCESSED") return "secondary";
  return "default";
}

function processingVariant(
  status: EstadoProcesamiento,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "FAILED") return "destructive";
  if (status === "SUCCEEDED") return "secondary";
  return "outline";
}

export function AllDocumentsView({
  documents,
  total,
  offset,
  limit,
  isLoading,
  error,
  onPageChange,
}: Props) {
  const pagination = resumirPaginacionHistorial({ offset, limit, total });

  return (
    <section
      aria-labelledby="todos-documentos-title"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="todos-documentos-title" className="text-xl font-semibold">
            Todos los documentos
          </h2>
          <p className="text-sm text-muted-foreground">
            Historial completo · {total} documentos
          </p>
        </div>
        {isLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando página…
          </p>
        )}
      </header>

      {error && (
        <p role="alert" className="shrink-0 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          No se pudo cargar esta página: {error}
        </p>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-white p-6 text-center text-muted-foreground">
          {isLoading ? "Cargando documentos…" : "No hay documentos registrados."}
        </div>
      ) : (
        <>
          <div
            role="list"
            aria-label="Lista de documentos"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain touch-pan-y md:hidden"
          >
            {documents.map((document) => {
              const status = document.status as StatusTriaje;
              const processingStatus =
                document.processing_status as EstadoProcesamiento;

              return (
                <Card className="shrink-0" key={document.documento_id} role="listitem">
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ID documento</p>
                      <p className="break-all font-medium">{document.documento_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paciente</p>
                      <p className="wrap-break-word">
                        {document.datos_extraidos.paciente.nombre ?? "No disponible"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo documental</p>
                      <p className="wrap-break-word">
                        {document.clasificacion.tipo_documento ?? "No disponible"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha de ingreso</p>
                      <time dateTime={document.created_at} className="wrap-break-word">
                        {formatDate(document.created_at)}
                      </time>
                    </div>
                    {document.processing_error && (
                      <p className="wrap-break-word text-xs text-muted-foreground">
                        {document.processing_error}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-row flex-nowrap gap-1 px-1 pt-2">
                    <Badge className="px-1" variant={statusVariant(status)}>
                      Estado: {statusLabels[status] ?? String(document.status ?? "No disponible")}
                    </Badge>
                    <Badge className="px-1" variant={processingVariant(processingStatus)}>
                      Procesamiento: {processingLabels[processingStatus] ??
                        String(document.processing_status ?? "No disponible")}
                    </Badge>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <div className="hidden min-h-0 flex-1 overflow-auto overscroll-y-contain rounded-xl border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID documento</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo documental</TableHead>
                  <TableHead>Fecha de ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Procesamiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => {
                  const status = document.status as StatusTriaje;
                  const processingStatus =
                    document.processing_status as EstadoProcesamiento;

                  return (
                    <TableRow key={document.documento_id}>
                      <TableCell className="font-medium">
                        {document.documento_id}
                      </TableCell>
                      <TableCell>
                        {document.datos_extraidos.paciente.nombre ?? "No disponible"}
                      </TableCell>
                      <TableCell>
                        {document.clasificacion.tipo_documento ?? "No disponible"}
                      </TableCell>
                      <TableCell>
                        <time dateTime={document.created_at}>
                          {formatDate(document.created_at)}
                        </time>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(status)}>
                          {statusLabels[status] ?? String(document.status ?? "No disponible")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={processingVariant(processingStatus)}>
                            {processingLabels[processingStatus] ??
                              String(document.processing_status ?? "No disponible")}
                          </Badge>
                          {document.processing_error && (
                            <span className="text-xs text-muted-foreground">
                              {document.processing_error}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <footer className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Mostrando {pagination.firstItem}–{pagination.lastItem} de {total} documentos
        </p>
        <nav
          aria-label="Paginación de documentos"
          className="flex items-center gap-2"
        >
          <Button
            variant="outline"
            disabled={pagination.previousOffset === null || isLoading}
            onClick={() => {
              if (pagination.previousOffset !== null) {
                void onPageChange(pagination.previousOffset);
              }
            }}
          >
            Anterior
          </Button>
          <span className="min-w-28 text-center text-sm" aria-live="polite">
            {pagination.totalPages === 0
              ? "Sin páginas"
              : `Página ${pagination.currentPage} de ${pagination.totalPages}`}
          </span>
          <Button
            variant="outline"
            disabled={pagination.nextOffset === null || isLoading}
            onClick={() => {
              if (pagination.nextOffset !== null) {
                void onPageChange(pagination.nextOffset);
              }
            }}
          >
            Siguiente
          </Button>
        </nav>
      </footer>
    </section>
  );
}
