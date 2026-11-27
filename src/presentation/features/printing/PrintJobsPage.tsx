import { Button } from "@/presentation/components/ui/button";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Input } from "@/presentation/components/ui/input";
import { Alert } from "@/presentation/components/ui/alert";
import { Card } from "@/presentation/components/ui/card";
import {
  printStatuses,
  type PrintStatus,
} from "@/core/entities/printing.entity";
import { usePrintJobs } from "@/infrastructure/hooks/use-printing";
import { apiError } from "@/shared/utils/api-error";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PrintJobBadge } from "./PrintJobStatus";
import {
  jobLabels,
  printDate,
  printDocumentNumber,
  printOrderContext,
  printStatusLabels,
} from "./printing-labels";

const limit = 20;
const printNumber = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/)
  .refine((value) => Number(value) >= 1 && Number(value) <= 2147483647);

export default function PrintJobsPage() {
  const [params, setParams] = useSearchParams();
  const status = printStatuses.find((value) => value === params.get("status"));
  const orderId = z.uuid().safeParse(params.get("orderId")).data;
  const ticketNumber = printNumber.safeParse(params.get("ticketNumber")).data;
  const orderNumber = printNumber.safeParse(params.get("orderNumber")).data;
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 5001 ? rawPage : 1;
  const jobs = usePrintJobs({
    status,
    orderId,
    ticketNumber,
    orderNumber,
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
  function searchByNumber(
    key?: "ticketNumber" | "orderNumber",
    value?: string,
  ) {
    const next = new URLSearchParams(params);
    next.delete("page");
    next.delete("ticketNumber");
    next.delete("orderNumber");
    if (key && value) next.set(key, value);
    setParams(next);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Cola de impresión</h1>
        <Button
          type="submit" variant="outline"
          disabled={jobs.isFetching}
          onClick={() => void jobs.refetch()}
        >
          Actualizar
        </Button>
      </div>
      <form
        key={`${ticketNumber ?? ""}|${orderNumber ?? ""}`}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const result = printNumber.safeParse(data.get("number"));
          if (!result.success) {
            const input = event.currentTarget.elements.namedItem("number");
            if (input instanceof HTMLInputElement) {
              input.setCustomValidity(
                "Ingresa un número entre 1 y 2147483647.",
              );
              input.reportValidity();
            }
            return;
          }
          searchByNumber(
            data.get("by") === "orderNumber" ? "orderNumber" : "ticketNumber",
            result.data,
          );
        }}
      >
        <label className="grid gap-1">
          Buscar por
          <NativeSelect
            name="by"
            defaultValue={orderNumber ? "orderNumber" : "ticketNumber"}
          >
            <option value="ticketNumber">N.º de ticket</option>
            <option value="orderNumber">N.º de pedido</option>
          </NativeSelect>
        </label>
        <label className="grid gap-1">
          Número
          <Input
            name="number"
            inputMode="numeric"
            placeholder="Ej. 000123"
            maxLength={10}
            required
            defaultValue={ticketNumber ?? orderNumber ?? ""}
            onChange={(event) => event.currentTarget.setCustomValidity("")}
          />
        </label>
        <Button type="submit">Buscar</Button>
        {(ticketNumber || orderNumber) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => searchByNumber()}
          >
            Limpiar búsqueda
          </Button>
        )}
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Estado
          <NativeSelect
            value={status ?? ""}
            onChange={(event) => update("status", event.target.value)}
          >
            <option value="">Todos</option>
            {printStatuses.map((value) => (
              <option key={value} value={value}>
                {printStatusLabels[value]}
              </option>
            ))}
          </NativeSelect>
        </label>
        {orderId && (
          <Button type="submit" variant="outline" onClick={() => update("orderId")}>
            Quitar filtro del pedido
          </Button>
        )}
      </div>
      {jobs.isPending && <p role="status">Cargando trabajos…</p>}
      {jobs.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(jobs.error, "No se pudo actualizar la cola.")}
        </Alert>
      )}
      {jobs.data?.items.length === 0 && (
        <p>No hay trabajos para este filtro.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.data?.items.map((job) => {
          const number = printDocumentNumber(job.payload);
          return (
            <Card
              key={job.id}
              as="li"
            >
              <Link
                to={{ pathname: job.id, search: params.toString() }}
                className="flex flex-col gap-4 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg leading-snug font-semibold">{jobLabels[job.type]}</h2>
                  <PrintJobBadge job={job} />
                </div>
                <p>
                  {printDate(job.createdAt)} · Intentos: {job.attempts}
                </p>
                {number && <p className="text-sm">N.º {number}</p>}
                {job.order && (
                  <p className="text-sm">
                    Pedido #{job.order.number} · {printOrderContext(job.order)}
                  </p>
                )}
                {job.printer && (
                  <p className="text-sm">Impresora {job.printer.name}</p>
                )}
              </Link>
            </Card>
          );
        })}
      </ul>
      {(page > 1 || (jobs.data?.total ?? 0) > limit) && (
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Paginación de trabajos"
        >
          <Button
            type="submit" variant="outline"
            disabled={page <= 1}
            onClick={() => update("page", String(page - 1))}
          >
            Anterior
          </Button>
          <span>
            Pág. {page} · {jobs.data?.total ?? "—"} trabajos
          </span>
          <Button
            type="submit" variant="outline"
            disabled={page >= 5001 || page * limit >= (jobs.data?.total ?? 0)}
            onClick={() => update("page", String(page + 1))}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
