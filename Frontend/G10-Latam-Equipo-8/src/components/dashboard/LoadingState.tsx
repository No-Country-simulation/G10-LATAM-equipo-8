import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  onCancel?: () => void;
  description?: string;
}

export function LoadingState({
  onCancel,
  description = "Esperá mientras cargamos los datos. No hace falta refrescar la página.",
}: Props) {
  return (
    <section
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <h2 className="text-lg font-semibold">Esperando lista de triajes…</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {onCancel && (
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      )}
    </section>
  );
}
