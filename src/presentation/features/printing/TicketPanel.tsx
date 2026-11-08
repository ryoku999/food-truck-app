import { printInProgress, type PrintJob } from "@/core/entities/printing.entity";
import { usePrintAction, usePrintJobs, usePrinters } from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PrintJobActions, PrintJobBadge } from "./PrintJobStatus";

export function TicketPanel({ orderId, paid }: { orderId: string; paid: boolean }) {
  const role = useAuthStore(state => state.user?.userRole);
  const management = role === "ADMIN" || role === "MANAGER";
  const printers = usePrinters(management);
  const jobs = usePrintJobs({ orderId, limit: 100, offset: 0 });
  const enqueue = usePrintAction<PrintJob>();
  const [printerId, setPrinterId] = useState("");
  const submitting = useRef(false);
  const path = `${role ? roleBasedRedirection(role) : ""}/print-jobs`;
  const latest = jobs.data?.items.find(job => job.type === "CUSTOMER_TICKET") ?? enqueue.data;
  const hasUnfinished = jobs.data?.items.some(job => job.type === "CUSTOMER_TICKET" && printInProgress(job)) || !!latest && printInProgress(latest);
  const blocked = !paid || enqueue.isPending || !jobs.isSuccess || hasUnfinished || latest?.status === "FAILED";
  return <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Ticket de cliente</h2><Link className="btn btn-outline" to={`${path}?orderId=${orderId}`}>Ver trabajos del pedido</Link></div>
    {!paid && <p>El ticket se habilita al completar el cobro.</p>}
    {management && paid && <label className="grid gap-1">Impresora de ticket<select className="select w-full sm:max-w-sm" value={printerId} onChange={event => setPrinterId(event.target.value)}>
      <option value="">Automática (Caja o General)</option>
      {printers.data?.filter(item => item.active && item.printerAgentId && (item.purpose === "CASHIER" || item.purpose === "GENERAL")).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>}
    {jobs.isPending && <p role="status">Consultando trabajos…</p>}
    {jobs.isError && <div className="alert alert-error" role="alert">{apiError(jobs.error, "No se pudo consultar la cola del pedido.")}<button className="btn" onClick={() => void jobs.refetch()}>Reintentar consulta</button></div>}
    {enqueue.isError && <p role="alert" className="alert alert-error">{apiError(enqueue.error, "No se confirmó el envío. Revisa la cola antes de generar otro ticket.")}</p>}
    {latest && <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2">Último ticket <PrintJobBadge job={latest} /> <Link className="link" to={`${path}/${latest.id}`}>Ver detalle</Link></p>
      <PrintJobActions key={latest.id} job={latest} blocked={jobs.isError || !paid} />
    </div>}
    <button className="btn btn-primary min-h-11" disabled={blocked || jobs.isFetching} onClick={async () => {
      if (blocked || submitting.current) return;
      if (latest?.status === "PRINTED" && !window.confirm("Ya hay un ticket confirmado. ¿Encolar una copia?")) return;
      // Recheck just before sending to avoid using an outdated queue snapshot.
      submitting.current = true;
      try {
        const result = await jobs.refetch();
        if (!result.isSuccess) return;
        const tickets = result.data.items.filter(job => job.type === "CUSTOMER_TICKET");
        if (tickets.some(printInProgress) || tickets[0]?.status === "FAILED" || tickets[0]?.id !== latest?.id) return;
        await enqueue.mutateAsync(repo => repo.ticket(orderId, management && printerId ? printerId : undefined));
      } catch { /* The mutation displays the error. */ }
      finally { submitting.current = false; }
    }}>{enqueue.isPending ? "Encolando…" : latest?.status === "PRINTED" ? "Encolar copia" : "Encolar ticket"}</button>
  </section>;
}
