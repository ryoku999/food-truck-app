import { useConfirm } from "@/presentation/components/use-confirm";
import { printInProgress, type PrintJob } from "@/core/entities/printing.entity";
import { usePrintAction, usePrintJobs, usePrinters } from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PrintJobActions, PrintJobBadge } from "./PrintJobStatus";

export function TicketPanel({ orderId, enabled, kind = "ticket" }: { orderId: string; enabled: boolean; kind?: "ticket" | "prebill" }) {
  const confirmAction = useConfirm();
  const prebill = kind === "prebill";
  const jobType = prebill ? "PREBILL" : "CUSTOMER_TICKET";
  const role = useAuthStore(state => state.user?.userRole);
  const management = role === "ADMIN" || role === "MANAGER";
  const printers = usePrinters(management);
  const jobs = usePrintJobs({ orderId, limit: 100, offset: 0 });
  const enqueue = usePrintAction<PrintJob>();
  const [printerId, setPrinterId] = useState("");
  const submitting = useRef(false);
  const copyId = useRef<string | undefined>(undefined);
  const path = `${role ? roleBasedRedirection(role) : ""}/print-jobs`;
  const latest = jobs.data?.items.find(job => job.type === jobType) ?? enqueue.data;
  const hasUnfinished = jobs.data?.items.some(job => job.type === jobType && printInProgress(job)) || !!latest && printInProgress(latest);
  const blocked = !enabled || enqueue.isPending || !jobs.isSuccess || hasUnfinished || latest?.status === "FAILED";
  if (role !== "CASHIER" && !management) return null;
  return <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{prebill ? "Precuenta" : "Ticket de cliente"}</h2><Link className="btn btn-outline" to={`${path}?orderId=${orderId}`}>Ver trabajos del pedido</Link></div>
    {prebill && <p>Cuenta informativa con consumo, abonos y saldo pendiente. El pedido continúa abierto.</p>}
    {!enabled && <p>{prebill ? "La precuenta requiere un pedido enviado y abierto, con todos sus productos enviados." : "El ticket se habilita al completar el cobro."}</p>}
    {management && enabled && <label className="grid gap-1">Impresora<select className="select w-full sm:max-w-sm" value={printerId} onChange={event => setPrinterId(event.target.value)}>
      <option value="">Automática (Caja o General)</option>
      {printers.data?.filter(item => item.active && item.printerAgentId && (item.purpose === "CASHIER" || item.purpose === "GENERAL")).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>}
    {jobs.isPending && <p role="status">Consultando trabajos…</p>}
    {jobs.isError && <div className="alert alert-error" role="alert">{apiError(jobs.error, "No se pudo consultar la cola del pedido.")}<button className="btn" onClick={() => void jobs.refetch()}>Reintentar consulta</button></div>}
    {enqueue.isError && <p role="alert" className="alert alert-error">{apiError(enqueue.error, "No se confirmó el envío. Revisa la cola antes de generar otro ticket.")}</p>}
    {latest && <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2">{prebill ? "Última precuenta" : "Último ticket"} <PrintJobBadge job={latest} /> <Link className="link" to={`${path}/${latest.id}`}>Ver detalle</Link></p>
      <PrintJobActions key={latest.id} job={latest} blocked={jobs.isError || !enabled} />
    </div>}
    <button className="btn btn-primary min-h-11" disabled={blocked || jobs.isFetching} onClick={async () => {
      if (blocked || submitting.current) return;
      if (latest?.status === "PRINTED" && !(await confirmAction(prebill ? "Ya hay una precuenta impresa. ¿Imprimir una copia o la cuenta actualizada?" : "Ya hay un ticket confirmado. ¿Encolar una copia?"))) return;
      // Recheck just before sending to avoid using an outdated queue snapshot.
      submitting.current = true;
      try {
        const result = await jobs.refetch();
        if (!result.isSuccess) return;
        const tickets = result.data.items.filter(job => job.type === jobType);
        if (tickets.some(printInProgress) || tickets[0]?.status === "FAILED" || tickets[0]?.id !== latest?.id) return;
        if (prebill && (latest?.status === "PRINTED" || latest?.status === "CANCELLED")) {
          copyId.current ??= crypto.randomUUID();
        }
        await enqueue.mutateAsync(repo => prebill
          ? repo.prebill(orderId, management && printerId ? printerId : undefined, copyId.current)
          : repo.ticket(orderId, management && printerId ? printerId : undefined));
        copyId.current = undefined;
      } catch { /* The mutation displays the error. */ }
      finally { submitting.current = false; }
    }}>{enqueue.isPending ? "Encolando…" : prebill ? "Imprimir precuenta" : latest?.status === "PRINTED" ? "Encolar copia" : "Encolar ticket"}</button>
  </section>;
}
