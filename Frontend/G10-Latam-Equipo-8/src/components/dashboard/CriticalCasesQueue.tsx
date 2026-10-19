import { useState, type FormEvent } from "react";
import type { AccionRevision, TriajeDocumento } from "@/types/triaje";
import { crearSolicitudRevision, type CamposFormularioRevision } from "./crearSolicitudRevision";
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
import { CheckCircle2 } from "lucide-react";

interface Props {
  cases: TriajeDocumento[];
  onReview: (id: string, request: ReturnType<typeof crearSolicitudRevision>) => Promise<void>;
  reviewError: string;
  reviewingId: string | null;
}

interface SeleccionRevision {
  documentoId: string;
  accion: AccionRevision;
}

const destinos = [
  { value: "HISTORIA_CLINICA", label: "Historia clínica" },
  { value: "EMERGENCIA_MEDICA", label: "Emergencia médica" },
  { value: "FARMACIA", label: "Farmacia" },
  { value: "AUDITORIA_AUTORIZACIONES", label: "Auditoría de autorizaciones" },
];

const tiposDocumentales = [
  "Informe de Laboratorio",
  "Informe de Imagenes",
  "Receta Medica",
  "Orden de Procedimiento",
  "Epicrisis",
  "Certificado Medico",
];

const etiquetasAccion: Record<AccionRevision, string> = {
  aprobar: "Aprobar",
  corregir_aprobar: "Corregir y aprobar",
  rechazar: "Rechazar",
};

function fechaLegible(createdAt: string): string {
  const fecha = new Date(createdAt);
  return Number.isNaN(fecha.getTime()) ? createdAt : fecha.toLocaleString();
}

function motivosAuditoria(documento: TriajeDocumento): string {
  return documento.audit_reasons.length > 0
    ? documento.audit_reasons.join(" · ")
    : "Sin motivos de auditoría informados";
}

export function CriticalCasesQueue({
  cases,
  onReview,
  reviewError,
  reviewingId,
}: Props) {
  const [seleccion, setSeleccion] = useState<SeleccionRevision | null>(null);
  const [campos, setCampos] = useState<CamposFormularioRevision>({
    revisor: "",
    comentario: "",
    destino: "",
    nombrePaciente: "",
    edadPaciente: "",
    borrarEdad: false,
    tipoDocumento: "",
    nivelPrioridad: "",
  });
  const [errorFormulario, setErrorFormulario] = useState("");
  const estaEnviando = reviewingId !== null;

  const iniciarRevision = (documentoId: string, accion: AccionRevision) => {
    setSeleccion({ documentoId, accion });
    setCampos({
      revisor: "",
      comentario: "",
      destino: "",
      nombrePaciente: "",
      edadPaciente: "",
      borrarEdad: false,
      tipoDocumento: "",
      nivelPrioridad: "",
    });
    setErrorFormulario("");
  };

  const enviarRevision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seleccion) return;

    const documento = cases.find(
      (item) => item.documento_id === seleccion.documentoId,
    );
    if (!documento) {
      setErrorFormulario("El documento ya no está disponible para revisión");
      return;
    }

    let solicitud: ReturnType<typeof crearSolicitudRevision>;
    try {
      solicitud = crearSolicitudRevision(seleccion.accion, campos, documento);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error ? error.message : "Revisa los datos ingresados",
      );
      return;
    }

    setErrorFormulario("");
    try {
      await onReview(seleccion.documentoId, solicitud);
      setSeleccion(null);
    } catch {
      // The hook retains the form and exposes the server error for correction/retry.
    }
  };

  const renderAcciones = (documento: TriajeDocumento) => {
    const puedeRevisar =
      documento.status === "NEEDS_AUDIT" &&
      (documento.processing_status === "SUCCEEDED" ||
        documento.processing_status === "FAILED");
    const disabled = estaEnviando || !puedeRevisar;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => iniciarRevision(documento.documento_id, "aprobar")}
        >
          Aprobar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => iniciarRevision(documento.documento_id, "corregir_aprobar")}
        >
          Corregir y aprobar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={() => iniciarRevision(documento.documento_id, "rechazar")}
        >
          Rechazar
        </Button>
      </div>
    );
  };

  const casoSeleccionado = cases.find(
    (documento) => documento.documento_id === seleccion?.documentoId,
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <h1 className="text-lg font-bold pb-3">Revisión de casos críticos</h1>
      {cases.length === 0 ? (
        <h2 className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground flex-1">
          <CheckCircle2 className="size-10 text-emerald-600" />
          No hay alertas críticas pendientes. <br />
          El triaje clínico está al día.
        </h2>
      ) : (
        <>
          <div className="flex flex-col gap-8 md:hidden">
            {cases.map((documento) => (
              <Card key={documento.documento_id}>
                <CardContent>
                  <p>
                    <strong>ID documento:</strong> {documento.documento_id}
                  </p>
                  <p>
                    <strong>Paciente:</strong>{" "}
                    {documento.datos_extraidos.paciente.nombre ?? "No disponible"}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {fechaLegible(documento.created_at)}
                  </p>
                  <p>
                    <strong>Motivos de auditoría:</strong> {motivosAuditoria(documento)}
                  </p>
                </CardContent>
                <CardFooter>{renderAcciones(documento)}</CardFooter>
              </Card>
            ))}
          </div>
          <div className="hidden md:block">
            <Table className="bg-white border-solid rounded-lg">
              <TableHeader>
                <TableRow>
                  <TableHead>ID documento</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivos de auditoría</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((documento) => (
                  <TableRow key={documento.documento_id}>
                    <TableCell>{documento.documento_id}</TableCell>
                    <TableCell>
                      {documento.datos_extraidos.paciente.nombre ?? "No disponible"}
                    </TableCell>
                    <TableCell>
                      <time dateTime={documento.created_at}>
                        {fechaLegible(documento.created_at)}
                      </time>
                    </TableCell>
                    <TableCell>{motivosAuditoria(documento)}</TableCell>
                    <TableCell>{renderAcciones(documento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {seleccion && casoSeleccionado && (
        <Card className="mt-6">
          <CardContent className="pt-5">
            <h2 className="text-base font-semibold">
              {etiquetasAccion[seleccion.accion]} · {casoSeleccionado.documento_id}
            </h2>
            <form
              id="formulario-revision"
              className="mt-4 grid gap-4"
              onSubmit={(event) => void enviarRevision(event)}
            >
              <label className="grid gap-1" htmlFor="revisor">
                Revisor
                <input
                  id="revisor"
                  className="rounded-md border px-3 py-2"
                  value={campos.revisor}
                  maxLength={100}
                  required
                  onChange={(event) => setCampos((actuales) => ({ ...actuales, revisor: event.target.value }))}
                />
              </label>
              <label className="grid gap-1" htmlFor="comentario">
                Comentario
                <textarea
                  id="comentario"
                  className="min-h-24 rounded-md border px-3 py-2"
                  value={campos.comentario}
                  maxLength={2000}
                  required
                  onChange={(event) => setCampos((actuales) => ({ ...actuales, comentario: event.target.value }))}
                />
              </label>

              {seleccion.accion !== "rechazar" && (
                <label className="grid gap-1" htmlFor="destino-revision">
                  Destino
                  <select
                    id="destino-revision"
                    className="rounded-md border px-3 py-2"
                    value={campos.destino}
                    required
                    onChange={(event) => setCampos((actuales) => ({ ...actuales, destino: event.target.value }))}
                  >
                    <option value="">Selecciona un destino</option>
                    {destinos.map((destino) => (
                      <option key={destino.value} value={destino.value}>
                        {destino.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {seleccion.accion === "corregir_aprobar" && (
                <fieldset className="grid gap-3 rounded-md border p-4">
                  <legend className="px-1 font-medium">Correcciones (opcionales)</legend>
                  <label className="grid gap-1" htmlFor="nombre-corregido">
                    Nombre del paciente
                    <input
                      id="nombre-corregido"
                      className="rounded-md border px-3 py-2"
                      value={campos.nombrePaciente ?? ""}
                      maxLength={100}
                      onChange={(event) => setCampos((actuales) => ({ ...actuales, nombrePaciente: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1" htmlFor="edad-corregida">
                    Edad del paciente
                    <input
                      id="edad-corregida"
                      type="number"
                      min={0}
                      max={130}
                      step={1}
                      className="rounded-md border px-3 py-2"
                      value={campos.edadPaciente ?? ""}
                      disabled={campos.borrarEdad}
                      onChange={(event) => setCampos((actuales) => ({ ...actuales, edadPaciente: event.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-2" htmlFor="borrar-edad">
                    <input
                      id="borrar-edad"
                      type="checkbox"
                      checked={Boolean(campos.borrarEdad)}
                      onChange={(event) => setCampos((actuales) => ({ ...actuales, borrarEdad: event.target.checked }))}
                    />
                    Eliminar la edad registrada
                  </label>
                  <label className="grid gap-1" htmlFor="tipo-documento-corregido">
                    Tipo de documento
                    <select
                      id="tipo-documento-corregido"
                      className="rounded-md border px-3 py-2"
                      value={campos.tipoDocumento ?? ""}
                      onChange={(event) => setCampos((actuales) => ({ ...actuales, tipoDocumento: event.target.value }))}
                    >
                      <option value="">Sin cambio</option>
                      {tiposDocumentales.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1" htmlFor="prioridad-corregida">
                    Nivel de prioridad
                    <select
                      id="prioridad-corregida"
                      className="rounded-md border px-3 py-2"
                      value={campos.nivelPrioridad ?? ""}
                      onChange={(event) => setCampos((actuales) => ({ ...actuales, nivelPrioridad: event.target.value }))}
                    >
                      <option value="">Sin cambio</option>
                      <option value="Rutina">Rutina</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </label>
                </fieldset>
              )}

              {(errorFormulario || reviewError) && (
                <p className="text-sm text-destructive" role="alert">
                  {errorFormulario || reviewError}
                </p>
              )}
            </form>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={estaEnviando}
              onClick={() => setSeleccion(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="formulario-revision"
              disabled={estaEnviando}
            >
              {estaEnviando ? "Registrando…" : "Confirmar revisión"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
