import type { PrintJob } from "@/core/entities/printing.entity";
import { canRetryPrintJob } from "@/core/entities/printing.entity";
import { usePrintAction, useRetryPrinters } from "@/infrastructure/hooks/use-printing";
import { useState } from "react";
import { toast } from "sonner";
import { apiError } from "@/shared/utils/api-error";
import { printStatusLabels } from "./printing-labels";

export function PrintJobBadge({ job }: { job: PrintJob }) {
  const badge =
    job.status === "PRINTED"
      ? "badge-success"
      : job.status === "FAILED"
        ? "badge-error"
        : job.status === "PROCESSING"
          ? "badge-info"
          : "badge-outline";
  return (
    <span className={`badge ${badge}`}>{printStatusLabels[job.status]}</span>
  );
}

export function PrintJobActions({
  job,
  blocked = false,
}: {
  job: PrintJob;
  blocked?: boolean;
}) {
  const retry = usePrintAction<PrintJob>();
  const [choosing, setChoosing] = useState(false);
  const [printerId, setPrinterId] = useState("");
  const safe = canRetryPrintJob(job);
  const canSwitchPrinter = safe && job.type === "PREBILL";
  const printers = useRetryPrinters(job.id, choosing && canSwitchPrinter && !blocked);
  if (job.status !== "FAILED") return null;
  const description = job.error?.replace(/^(RETRYABLE|UNCERTAIN):\s*/, "");
  return (
    <div className="space-y-2">
      {description && <p className="wrap-break-word text-sm">{description}</p>}
      {safe ? (
        <button
          className="btn btn-outline min-h-11"
          disabled={blocked || retry.isPending}
          onClick={() => retry.mutate((repo) => repo.retry(job.id))}
        >
          {retry.isPending ? "Reencolando…" : "Reintentar trabajo"}
        </button>
      ) : (
        <p className="text-sm">
          El resultado puede ser incierto. Revisa la salida del agente antes de
          generar otro trabajo.
        </p>
      )}
      {canSwitchPrinter && (
        <>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            disabled={blocked || retry.isPending}
            aria-expanded={choosing}
            onClick={() => setChoosing((open) => !open)}
          >
            Reintentar en otra impresora
          </button>
          {choosing && (
            <div className="space-y-2">
              {printers.isLoading && <p role="status">Buscando destinos…</p>}
              {printers.isError && (
                <p role="alert">{apiError(printers.error, "No se pudieron consultar las impresoras.")}</p>
              )}
              {printers.data?.length === 0 && <p>No hay otra impresora de Caja disponible.</p>}
              {!!printers.data?.length && (
                <>
                  <label className="grid gap-1">
                    Impresora de destino
                    <select
                      className="select w-full sm:max-w-sm"
                      value={printerId}
                      disabled={blocked || retry.isPending}
                      onChange={(event) => setPrinterId(event.target.value)}
                    >
                      <option value="">Selecciona una impresora</option>
                      {printers.data.map((printer) => (
                        <option key={printer.id} value={printer.id}>{printer.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary min-h-11"
                    disabled={blocked || retry.isPending || !printers.data.some((printer) => printer.id === printerId)}
                    onClick={() => retry.mutate((repo) => repo.retry(job.id, printerId), {
                      onSuccess: () => {
                        setChoosing(false);
                        setPrinterId("");
                        toast.success("Precuenta reencolada en la impresora elegida");
                      },
                    })}
                  >
                    {retry.isPending ? "Reencolando…" : "Confirmar reintento"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {retry.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(
            retry.error,
            "No se confirmó el reintento. Actualiza la cola.",
          )}
        </p>
      )}
    </div>
  );
}
