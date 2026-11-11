import { usePrintJob } from "@/infrastructure/hooks/use-printing";
import { apiError } from "@/shared/utils/api-error";
import { Link, useLocation, useParams } from "react-router-dom";
import { PrintJobActions, PrintJobBadge } from "./PrintJobStatus";
import { jobLabels, printDate } from "./printing-labels";

export default function PrintJobPage() {
  const { jobId = "" } = useParams();
  const { search } = useLocation();
  const query = usePrintJob(jobId);
  const job = query.data;
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
            <dl className="space-y-2 break-all">
              <div>
                <dt className="font-semibold">Trabajo</dt>
                <dd>{job.id}</dd>
              </div>
              <div>
                <dt className="font-semibold">Impresora</dt>
                <dd>{job.printerId}</dd>
              </div>
              {job.orderId && (
                <div>
                  <dt className="font-semibold">Pedido</dt>
                  <dd>{job.orderId}</dd>
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
            <details className="collapse collapse-arrow bg-base-200">
              <summary className="collapse-title">Contenido enviado</summary>
              <pre className="collapse-content whitespace-pre-wrap break-all text-sm">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
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
