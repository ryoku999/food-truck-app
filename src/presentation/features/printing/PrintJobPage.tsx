import { usePrintJob } from "@/infrastructure/hooks/use-printing";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Link, useLocation, useParams } from "react-router-dom";
import { PrintJobActions, PrintJobBadge } from "./PrintJobStatus";
import {
  jobLabels,
  printContent,
  printDate,
  printDocumentNumber,
  printOrderContext,
} from "./printing-labels";

export default function PrintJobPage() {
  const { jobId = "" } = useParams();
  const { search } = useLocation();
  const query = usePrintJob(jobId);
  const job = query.data;
  const role = useAuthStore((state) => state.user?.userRole);
  const number = printDocumentNumber(job?.payload);
  const lines = printContent(job?.payload);
  const accountPath =
    role && job?.orderId
      ? `${roleBasedRedirection(role)}${role === "CASHIER" ? "" : "/cashier"}/accounts/${job.orderId}`
      : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        className="btn btn-ghost"
        to={{ pathname: "..", search }}
        relative="path"
      >
        Volver a la cola
      </Link>
      {query.isPending && <p role="status">Cargando trabajo…</p>}
      {query.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(query.error, "No se pudo consultar el trabajo.")}
        </p>
      )}
      {job && (
        <section className="card border border-base-300 bg-base-100">
          <div className="card-body">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold">{jobLabels[job.type]}</h1>
              <PrintJobBadge job={job} />
            </div>
            <dl className="space-y-2 wrap-break-word">
              {number && (
                <div>
                  <dt className="font-semibold">Número impreso</dt>
                  <dd>{number}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Impresora</dt>
                <dd>{job.printer?.name ?? "Nombre no disponible"}</dd>
              </div>
              {job.orderId && (
                <div>
                  <dt className="font-semibold">Pedido</dt>
                  <dd>
                    {accountPath ? (
                      <Link className="link link-primary" to={accountPath}>
                        {job.order
                          ? `Pedido #${job.order.number}`
                          : "Ver pedido"}
                      </Link>
                    ) : job.order ? (
                      `Pedido #${job.order.number}`
                    ) : (
                      "Número no disponible"
                    )}
                    {job.order && ` · ${printOrderContext(job.order)}`}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Creado · Intentos</dt>
                <dd>
                  {printDate(job.createdAt)} · {job.attempts}
                </dd>
              </div>
              {job.printedAt && (
                <div>
                  <dt className="font-semibold">Confirmación del agente</dt>
                  <dd>{printDate(job.printedAt)}</dd>
                </div>
              )}
            </dl>
            {job.status === "PROCESSING" && (
              <p>
                El agente tomó el trabajo. Si no llega una confirmación, revisa
                la impresora o el archivo de salida antes de generar otro.
              </p>
            )}
            <PrintJobActions key={job.id} job={job} blocked={query.isError} />
            {lines.length > 0 && (
              <details className="collapse collapse-arrow bg-base-200">
                <summary className="collapse-title">Texto del trabajo</summary>
                <pre className="collapse-content whitespace-pre-wrap wrap-break-word text-sm">
                  {lines.join("\n")}
                </pre>
              </details>
            )}
            <details className="collapse collapse-arrow bg-base-200">
              <summary className="collapse-title">Datos técnicos</summary>
              <ul className="collapse-content break-all font-mono text-xs">
                <li>Trabajo: {job.id}</li>
                <li>Impresora: {job.printerId}</li>
                {job.orderId && <li>Pedido: {job.orderId}</li>}
              </ul>
            </details>
          </div>
        </section>
      )}
      <button
        className="btn btn-outline"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Actualizar estado
      </button>
    </div>
  );
}
