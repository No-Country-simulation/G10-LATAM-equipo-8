import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prioridadClinicaLegible } from "@/hooks/documentUploadController";
import {
  auditReasonLabel,
  processingStatusLabel,
  reviewStatusLabel,
} from "../../lib/documentLabels";
import {
  countUrgentAlerts,
  filterCollectionDocuments,
} from "@/hooks/documentCollectionsController";
import type { HistoryResponse, StatusTriaje, TriajeDocumento } from "@/types/triaje";
import { resumirPaginacionHistorial } from "./resumenPaginacionHistorial";

type CollectionKind = "pending" | "all" | "alerts";

interface Props {
  kind: CollectionKind;
  page: HistoryResponse;
  hasPage: boolean;
  isLoading: boolean;
  error: string | null;
  search: string;
  documentType: string;
  reviewStatusFilter: StatusTriaje | "";
  onSearchChange: (search: string) => void;
  onDocumentTypeChange: (documentType: string) => void;
  onReviewStatusChange: (status: StatusTriaje | "") => void;
  onPageChange: (offset: number) => Promise<void>;
  onRetry: () => Promise<void>;
  onOpenDocument: (document: TriajeDocumento) => void;
}

const reviewStatuses: Array<{ value: StatusTriaje; label: string }> = [
  { value: "PROCESSED", label: reviewStatusLabel("PROCESSED") },
  { value: "NEEDS_AUDIT", label: reviewStatusLabel("NEEDS_AUDIT") },
  { value: "APPROVED", label: reviewStatusLabel("APPROVED") },
  { value: "REJECTED", label: reviewStatusLabel("REJECTED") },
];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function auditReason(document: TriajeDocumento): string {
  return document.audit_reasons.length > 0
    ? document.audit_reasons.map(auditReasonLabel).join(" · ")
    : "Sin motivos de auditoría informados";
}

function statusVariant(status: TriajeDocumento["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "NEEDS_AUDIT" || status === "REJECTED") return "destructive";
  if (status === "PROCESSED") return "secondary";
  return "default";
}

function priorityVariant(priority: TriajeDocumento["clasificacion"]["nivel_prioridad"]): "default" | "secondary" | "destructive" | "outline" {
  if (priority === "Urgente") return "destructive";
  if (priority === "Rutina") return "secondary";
  return "outline";
}

function CollectionDocumentDetails({
  document,
  showPriority = true,
}: {
  document: TriajeDocumento;
  showPriority?: boolean;
}) {
  const priority = document.clasificacion.nivel_prioridad;
  return (
    <>
      <p className="wrap-break-word text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium text-foreground">Motivo:</span> {auditReason(document)}
      </p>
      <p className="wrap-break-word text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium text-foreground">Apoyo:</span>{" "}
        {document.decision_enrutamiento.justificacion_enrutamiento}
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant={statusVariant(document.status)}>
          Estado: {reviewStatusLabel(document.status)}
        </Badge>
        <Badge variant={document.processing_status === "FAILED" ? "destructive" : "outline"}>
          Procesamiento: {processingStatusLabel(document.processing_status)}
        </Badge>
        {document.decision_enrutamiento.alerta_urgente === true ? (
          <Badge variant="destructive">Alerta inmediata</Badge>
        ) : null}
      </div>
      {showPriority ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Prioridad clínica:</span>
          <Badge variant={priorityVariant(priority)}>{prioridadClinicaLegible(priority)}</Badge>
        </div>
      ) : null}
    </>
  );
}

export function DocumentCollectionView({
  kind,
  page,
  hasPage,
  isLoading,
  error,
  search,
  documentType,
  reviewStatusFilter,
  onSearchChange,
  onDocumentTypeChange,
  onReviewStatusChange,
  onPageChange,
  onRetry,
  onOpenDocument,
}: Props) {
  const visibleDocuments = filterCollectionDocuments(
    page.items,
    { search, documentType },
    kind === "alerts",
  );
  const localFiltersActive = search.trim().length > 0 || documentType.length > 0;
  const pagination = resumirPaginacionHistorial({
    offset: page.offset,
    limit: page.limit,
    total: page.total,
  });
  const documentTypes = Array.from(
    new Set(
      page.items
        .map((document) => document.clasificacion.tipo_documento)
        .filter((type): type is string => Boolean(type)),
    ),
  ).sort((left, right) => left.localeCompare(right));
  if (documentType && !documentTypes.includes(documentType)) {
    documentTypes.push(documentType);
  }

  const title =
    kind === "pending"
      ? "Pendientes"
      : kind === "all"
        ? "Todos los documentos"
        : "Alertas inmediatas";
  const emptyMessage =
    kind === "pending"
      ? "No hay documentos pendientes de auditoría."
      : kind === "all"
        ? "No hay documentos registrados."
        : "No hay alertas inmediatas entre los documentos cargados de esta página.";
  const paginationDescription =
    kind === "pending" ? "pendientes de auditoría" : "documentos";

  return (
    <section
      aria-labelledby="document-collection-title"
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="document-collection-title" className="text-2xl font-semibold text-foreground">
            {title}
          </h2>
          {kind === "pending" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              La cantidad pendiente corresponde a auditoría humana y no representa alertas de urgencia clínica.{hasPage ? ` · ${page.total} pendientes de auditoría` : ""}
            </p>
          ) : kind === "all" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Historial completo{hasPage ? ` · ${page.total} documentos` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Esta página reúne las alertas que necesitan atención inmediata.
            </p>
          )}
        </div>
        {kind === "alerts" && hasPage ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Alertas inmediatas en esta página: {countUrgentAlerts(page.items)}
          </p>
        ) : null}
        {isLoading ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {kind === "pending" ? "Cargando la colección solicitada…" : "Cargando página…"}
          </p>
        ) : null}
      </header>

      <div className="grid shrink-0 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
          Paciente o documento
          <Input
            aria-label="Paciente o documento"
            placeholder="Paciente o documento"
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
          Tipo de documento
          <NativeSelect
            aria-label="Tipo de documento"
            value={documentType}
            onChange={(event) => onDocumentTypeChange(event.currentTarget.value)}
          >
            <option value="">Todos los tipos</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </NativeSelect>
        </label>
        {kind !== "pending" ? (
          <label className="grid gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            Estado de revisión
            <NativeSelect
              aria-label="Estado de revisión"
              value={reviewStatusFilter}
              onChange={(event) => onReviewStatusChange(event.currentTarget.value as StatusTriaje | "")}
            >
              <option value="">Todos los estados</option>
              {reviewStatuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <p className="self-end text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
          Búsqueda y tipo de documento se aplican solo a los registros cargados en esta página.
        </p>
      </div>

      {error ? (
        <section
          role="alert"
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-400 bg-card p-4 text-sm text-red-700 dark:text-red-300"
        >
          <p>
            {kind === "pending" ? "No se pudo cargar la cola de auditoría:" : "No se pudo cargar esta página:"} {error}
          </p>
          <Button variant="outline" disabled={isLoading} onClick={() => void onRetry()}>
            {isLoading
              ? "Reintentando…"
              : kind === "pending"
                ? "Reintentar cola"
                : "Reintentar página"}
          </Button>
        </section>
      ) : null}

      {!hasPage && isLoading ? (
        <p role="status" className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {kind === "pending" ? "Cargando la colección solicitada…" : "Cargando documentos…"}
        </p>
      ) : null}
      {hasPage && page.items.length === 0 ? (
        <p role="status" className="rounded-lg border border-border bg-card p-6 text-slate-700 dark:text-slate-300">
          {emptyMessage}
        </p>
      ) : null}
      {hasPage && page.items.length > 0 && visibleDocuments.length === 0 ? (
        <div role="status" className="rounded-lg border border-border bg-card p-6 text-slate-700 dark:text-slate-300">
          {localFiltersActive ? (
            <>
              <p>No hay coincidencias en los documentos cargados de esta página.</p>
              <Button
                type="button"
                variant="link"
                className="mt-2 min-h-11 px-0 text-teal-800 dark:text-teal-300"
                onClick={() => {
                  onSearchChange("");
                  onDocumentTypeChange("");
                }}
              >
                Limpiar búsqueda y tipo
              </Button>
            </>
          ) : (
            emptyMessage
          )}
        </div>
      ) : null}

      {hasPage && visibleDocuments.length > 0 ? (
        <>
          <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
            Coincidencias en esta página: {visibleDocuments.length}
          </p>
          <div
            role="list"
            aria-label={title}
            className="flex flex-col gap-3 lg:hidden"
          >
            {visibleDocuments.map((document) => (
              <Card key={document.documento_id} role="listitem" className="shrink-0">
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="wrap-break-word font-medium text-foreground">
                      {document.datos_extraidos.paciente.nombre ?? "Paciente sin identificar"}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-700 dark:text-slate-300">
                      Documento: {document.documento_id}
                    </p>
                    <p className="mt-1 wrap-break-word text-sm text-slate-700 dark:text-slate-300">
                      Tipo de documento: {document.clasificacion.tipo_documento ?? "Sin dato"}
                    </p>
                  </div>
                  <CollectionDocumentDetails document={document} />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium text-foreground">Fecha:</span>{" "}
                    <time dateTime={document.created_at}>{formatDate(document.created_at)}</time>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    type="button"
                    className="min-h-11 w-full"
                    data-review-dialog-return-focus
                    onClick={(event) => {
                      event.currentTarget.focus();
                      onOpenDocument(document);
                    }}
                  >
                    Revisar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="hidden min-h-0 flex-1 overflow-auto overscroll-y-contain rounded-xl border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento / paciente</TableHead>
                  <TableHead>Motivo y estado</TableHead>
                  <TableHead>Prioridad clínica</TableHead>
                  <TableHead>Recibido</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDocuments.map((document) => (
                  <TableRow key={document.documento_id}>
                    <TableCell className="min-w-48">
                      <p className="font-medium text-foreground">
                        {document.datos_extraidos.paciente.nombre ?? "Paciente sin identificar"}
                      </p>
                      <p className="break-all text-sm text-slate-700 dark:text-slate-300">{document.documento_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {document.clasificacion.tipo_documento ?? "Sin dato"}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-64">
                      <CollectionDocumentDetails document={document} showPriority={false} />
                    </TableCell>
                    <TableCell>
                      <div className="grid justify-items-start gap-1">
                        <span className="text-xs text-muted-foreground">Prioridad clínica</span>
                        <Badge variant={priorityVariant(document.clasificacion.nivel_prioridad)}>
                          {prioridadClinicaLegible(document.clasificacion.nivel_prioridad)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <time dateTime={document.created_at}>{formatDate(document.created_at)}</time>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        data-review-dialog-return-focus
                        onClick={(event) => {
                          event.currentTarget.focus();
                          onOpenDocument(document);
                        }}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      {hasPage ? (
        <footer className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
              Mostrando {pagination.firstItem}–{pagination.lastItem} de {page.total} {paginationDescription}
            </p>
            {kind === "alerts" ? (
              <p className="text-xs text-muted-foreground">Paginación y total del historial, no de alertas globales.</p>
            ) : null}
          </div>
          <nav aria-label={`Paginación de ${title.toLocaleLowerCase()}`} className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pagination.previousOffset === null || isLoading}
              onClick={() => {
                if (pagination.previousOffset !== null) void onPageChange(pagination.previousOffset);
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
              type="button"
              variant="outline"
              disabled={pagination.nextOffset === null || isLoading}
              onClick={() => {
                if (pagination.nextOffset !== null) void onPageChange(pagination.nextOffset);
              }}
            >
              Siguiente
            </Button>
          </nav>
        </footer>
      ) : null}
    </section>
  );
}
