import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Alert } from "@/presentation/components/ui/alert";
import type { PrintJob } from "@/core/entities/printing.entity";
import { canRetryPrintJob } from "@/core/entities/printing.entity";
import { usePrintAction, useRetryPrinters } from "@/infrastructure/hooks/use-printing";
import { useState } from "react";
import { toast } from "sonner";
import { apiError } from "@/shared/utils/api-error";
import { useConfirm } from "@/presentation/components/use-confirm";
import { printStatusLabels } from "./printing-labels";

export function PrintJobBadge({ job }: { job: Pick<PrintJob, "status"> }) {
  const badge =
    job.status === "PRINTED"
      ? "success"
      : job.status === "FAILED"
        ? "destructive"
        : job.status === "PROCESSING"
          ? "info"
          : "outline";
  return (
    <Badge variant={badge}>{printStatusLabels[job.status]}</Badge>
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
  const confirmAction = useConfirm();
  const [choosing, setChoosing] = useState(false);
  const [printerId, setPrinterId] = useState("");
  const safe = canRetryPrintJob(job);
  const canSwitchPrinter = safe && job.type === "PREBILL";
  const canConfirmMissingPaper =
    (job.type === "KITCHEN_COMMAND" || job.type === "BAR_COMMAND") &&
    job.error?.startsWith("UNCERTAIN:");
  const printers = useRetryPrinters(job.id, choosing && canSwitchPrinter && !blocked);
  if (job.status !== "FAILED") return null;
  const description = job.error?.replace(/^(RETRYABLE|UNCERTAIN):\s*/, "");
  return (
    <div className="space-y-2">
      {description && <p className="wrap-break-word text-sm">{description}</p>}
      {safe ? (
        <Button
          type="submit" variant="outline" className="min-h-11"
          disabled={blocked || retry.isPending}
          onClick={() => retry.mutate((repo) => repo.retry(job.id))}
        >
          {retry.isPending ? "Reencolando…" : "Reintentar trabajo"}
        </Button>
      ) : (
        <p className="text-sm">
          El resultado puede ser incierto. Revisa la salida del agente antes de
          generar otro trabajo.
        </p>
      )}
      {canConfirmMissingPaper && (
        <Button
          type="button"
          variant="outline" className="min-h-11"
          disabled={blocked || retry.isPending}
          onClick={async () => {
            const confirmed = await confirmAction({
              title: "¿Confirmas que la comanda no salió?",
              message: "Verifica el papel y coordina con el área antes de volver a enviar la comanda.",
              acceptLabel: "Confirmar y reintentar",
            });
            if (confirmed) {
              retry.mutate((repo) => repo.retry(job.id, { confirmedMissingPaper: true }));
            }
          }}
        >
          {retry.isPending ? "Reencolando…" : "Reintentar si no salió papel"}
        </Button>
      )}
      {canSwitchPrinter && (
        <>
          <Button
            type="button"
            variant="outline" className="min-h-11"
            disabled={blocked || retry.isPending}
            aria-expanded={choosing}
            onClick={() => setChoosing((open) => !open)}
          >
            Reintentar en otra impresora
          </Button>
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
                    <NativeSelect
                      className="w-full sm:max-w-sm"
                      value={printerId}
                      disabled={blocked || retry.isPending}
                      onChange={(event) => setPrinterId(event.target.value)}
                    >
                      <option value="">Selecciona una impresora</option>
                      {printers.data.map((printer) => (
                        <option key={printer.id} value={printer.id}>{printer.name}</option>
                      ))}
                    </NativeSelect>
                  </label>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={blocked || retry.isPending || !printers.data.some((printer) => printer.id === printerId)}
                    onClick={() => retry.mutate((repo) => repo.retry(job.id, { printerId }), {
                      onSuccess: () => {
                        setChoosing(false);
                        setPrinterId("");
                        toast.success("Precuenta reencolada en la impresora elegida");
                      },
                    })}
                  >
                    {retry.isPending ? "Reencolando…" : "Confirmar reintento"}
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {retry.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(
            retry.error,
            "No se confirmó el reintento. Actualiza la cola.",
          )}
        </Alert>
      )}
    </div>
  );
}
