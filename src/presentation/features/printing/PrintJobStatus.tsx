import type { PrintJob } from "@/core/entities/printing.entity";
import { canRetryPrintJob } from "@/core/entities/printing.entity";
import { usePrintAction } from "@/infrastructure/hooks/use-printing";
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
  if (job.status !== "FAILED") return null;
  const safe = canRetryPrintJob(job);
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
