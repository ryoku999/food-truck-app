import {
  printStatuses,
  type PrintStatus,
} from "@/core/entities/printing.entity";
import { usePrintJobs } from "@/infrastructure/hooks/use-printing";
import { apiError } from "@/shared/utils/api-error";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PrintJobBadge } from "./PrintJobStatus";
import { jobLabels, printDate, printStatusLabels } from "./printing-labels";

const limit = 20;

export default function PrintJobsPage() {
  const [params, setParams] = useSearchParams();
  const status = printStatuses.find((value) => value === params.get("status"));
  const orderId = z.uuid().safeParse(params.get("orderId")).data;
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 5001 ? rawPage : 1;
  const jobs = usePrintJobs({
    status,
    orderId,
    limit,
    offset: (page - 1) * limit,
  });
  function update(
    key: "page" | "status" | "orderId",
    value?: string | PrintStatus,
  ) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Cola de impresión</h1>
        <button
          className="btn btn-outline"
          disabled={jobs.isFetching}
          onClick={() => void jobs.refetch()}
        >
          Actualizar
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Estado
          <select
            className="select"
            value={status ?? ""}
            onChange={(event) => update("status", event.target.value)}
          >
            <option value="">Todos</option>
            {printStatuses.map((value) => (
              <option key={value} value={value}>
                {printStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        {orderId && (
          <button className="btn btn-outline" onClick={() => update("orderId")}>
            Quitar filtro del pedido
          </button>
        )}
      </div>
      {jobs.isPending && <p role="status">Cargando trabajos…</p>}
      {jobs.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(jobs.error, "No se pudo actualizar la cola.")}
        </p>
      )}
      {jobs.data?.items.length === 0 && (
        <p>No hay trabajos para este filtro.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.data?.items.map((job) => (
          <li key={job.id} className="card border border-base-300 bg-base-100">
            <Link
              to={{ pathname: job.id, search: params.toString() }}
              className="card-body"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title">{jobLabels[job.type]}</h2>
                <PrintJobBadge job={job} />
              </div>
              <p>
                {printDate(job.createdAt)} · Intentos: {job.attempts}
              </p>
              <p className="text-sm">Trabajo {job.id.slice(0, 8)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {(page > 1 || (jobs.data?.total ?? 0) > limit) && (
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Paginación de trabajos"
        >
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => update("page", String(page - 1))}
          >
            Anterior
          </button>
          <span>
            Pág. {page} · {jobs.data?.total ?? "—"} trabajos
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= 5001 || page * limit >= (jobs.data?.total ?? 0)}
            onClick={() => update("page", String(page + 1))}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
