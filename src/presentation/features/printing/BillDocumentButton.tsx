import type { PrintJob } from "@/core/entities/printing.entity";
import { usePrintAction, usePrintJob } from "@/infrastructure/hooks/use-printing";
import { useRef } from "react";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Document = { paymentId: string } | { orderId: string; partId: string };

export function BillDocumentButton({
  document,
  disabled,
}: {
  document: Document;
  disabled?: boolean;
}) {
  const action = usePrintAction<PrintJob>();
  const role = useAuthStore((state) => state.user?.userRole);
  const title =
    "paymentId" in document ? "recibo del abono" : "ticket de la parte";
  const jobId = action.data?.id;
  const part = "partId" in document ? document : undefined;
  const job = usePrintJob(part ? jobId ?? "" : "");
  const copyId = useRef<string | undefined>(undefined);
  return (
    <div className="space-y-2">
      {jobId && role ? (
        <Link
          className="btn btn-outline min-h-11"
          to={`${roleBasedRedirection(role)}/print-jobs/${jobId}`}
        >
          Ver estado del {title}
        </Link>
      ) : (
        <button
          className="btn btn-outline min-h-11"
          type="button"
          disabled={disabled || action.isPending}
          onClick={() =>
            action.mutate(
              (repo) =>
                "paymentId" in document
                  ? repo.receipt(document.paymentId)
                  : repo.partTicket(document.orderId, document.partId),
              { onSuccess: () => toast.success(`Impresión de ${title} enviada a la cola`) },
            )
          }
        >
          {action.isPending ? "Consultando cola…" : `Imprimir ${title}`}
        </button>
      )}
      {part && job.data?.status === "PRINTED" && (
        <button
          type="button"
          className="btn btn-outline min-h-11"
          disabled={disabled || action.isPending || job.isError}
          onClick={() => {
            const id = (copyId.current ??= globalThis.crypto.randomUUID());
            action.mutate((repo) => repo.partTicket(part.orderId, part.partId, id), {
              onSuccess: () => {
                copyId.current = undefined;
                toast.success("Ticket actualizado en la cola de impresión");
              },
            });
          }}
        >
          {action.isPending ? "Encolando…" : "Reimprimir ticket de la parte"}
        </button>
      )}
      {action.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(action.error, "No se pudo preparar la impresión.")}
        </p>
      )}
    </div>
  );
}
