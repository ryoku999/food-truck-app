import type { DateRange, ReportParams, ReportResults, Totals } from "@/core/entities/insights.entity";
import { useCashRegisters } from "@/infrastructure/hooks/use-cashier";
import { useReport } from "@/infrastructure/hooks/use-insights";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { moneyFormatter } from "../waiter/order-labels";
import { dateMs, defaultRange, limaDateTime } from "./insights-dates";

const labels = { dashboard: "Resumen", sales: "Ventas", products: "Productos", waiters: "Mozos", "payment-methods": "Métodos de pago", "cash-sessions": "Cierres de caja" } as const;
type Report = keyof ReportResults;
type Format = (value: string | null) => string;
const date = z.iso.date().refine(value => /^20/.test(value), "Usa fechas entre 2000 y 2099");
const schema = z.object({
  from: date, to: date, groupBy: z.enum(["day", "month"]),
  limit: z.number().int().min(1).max(100), cashRegisterId: z.string(),
}).superRefine(({ from, to }, context) => {
  const days = (dateMs(to) - dateMs(from)) / 86400000 + 1;
  if (days < 1 || days > 366) context.addIssue({ code: "custom", path: ["to"], message: "Selecciona un rango válido de hasta 366 días." });
});
type Filters = z.infer<typeof schema>;

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: { key: string; cells: ReactNode[] }[] }) {
  if (!rows.length) return <p className="rounded-box border border-base-300 bg-base-100 p-4">Sin resultados para este rango.</p>;
  return <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100" tabIndex={0} aria-label={title}>
    <table className="table">
      <caption className="sr-only">{title}</caption>
      <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}>{row.cells.map((cell, index) =>
        index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index} className="whitespace-nowrap tabular-nums">{cell}</td>
      )}</tr>)}</tbody>
    </table>
  </div>;
}

function Metrics({ values }: { values: [string, ReactNode][] }) {
  return <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">{values.map(([label, value]) => <div key={label} className="rounded-box border border-base-300 bg-base-100 p-3 sm:p-4">
    <dt className="text-sm">{label}</dt><dd className="break-words text-xl font-bold tabular-nums">{value}</dd>
  </div>)}</dl>;
}

const totalsHeaders = ["Cobrado", "Anulado", "Reembolsado", "Pagos", "Pedidos con cobros"];
const totalCells = (item: Totals, format: Format) => [format(item.collected), format(item.cancelled), format(item.refunded), item.paymentCount, item.orderCount];
const totalsMetrics = (item: Totals, format: Format): [string, ReactNode][] =>
  totalsHeaders.map((header, index) => [header, totalCells(item, format)[index]]);

function ReadReport<K extends Report>({ report, params, children }: {
  report: K; params: ReportParams[K]; children: (data: ReportResults[K]) => ReactNode;
}) {
  const query = useReport(report, params);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">{labels[report]}</h2>
      <button type="button" className="btn btn-outline" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Actualizando…" : "Actualizar"}</button>
    </div>
    {query.isPending && <p role="status">Consultando reporte…</p>}
    {query.isError && <p className="alert alert-error" role="alert">{apiError(query.error, "No se pudo consultar el reporte.")}</p>}
    {query.data && children(query.data)}
  </section>;
}

function MethodsTable({ data, format }: { data: ReportResults["payment-methods"]; format: Format }) {
  return <Table title="Cobros por método" headers={["Método", ...totalsHeaders]} rows={data.items.map(item => ({ key: item.id, cells: [item.name, ...totalCells(item, format)] }))} />;
}

function ReportBody({ tab, filters, format }: { tab: Report; filters: Filters; format: Format }) {
  const range: DateRange = { from: filters.from, to: filters.to };
  switch (tab) {
    case "dashboard": return <>
      <ReadReport report="dashboard" params={range}>{data => <Metrics values={[
        ...totalsMetrics(data, format), ["Pedidos abiertos", data.openOrders], ["Pedidos cancelados", data.cancelledOrders],
      ]} />}</ReadReport>
      <ReadReport report="payment-methods" params={range}>{data => <MethodsTable data={data} format={format} />}</ReadReport>
    </>;
    case "sales": return <ReadReport report="sales" params={{ ...range, groupBy: filters.groupBy }}>{data => <>
      <Metrics values={totalsMetrics(data.totals, format)} />
      <Table title="Ventas por período" headers={[data.groupBy === "day" ? "Día" : "Mes", ...totalsHeaders]} rows={data.items.map(item => ({ key: item.period, cells: [item.period, ...totalCells(item, format)] }))} />
    </>}</ReadReport>;
    case "products": return <ReadReport report="products" params={{ ...range, limit: filters.limit }}>{data =>
      <Table title="Productos vendidos" headers={["Producto", "Unidades", "Subtotal"]} rows={data.items.map(item => ({ key: JSON.stringify([item.productId, item.name]), cells: [item.name, item.quantity, format(item.subtotal)] }))} />
    }</ReadReport>;
    case "waiters": return <ReadReport report="waiters" params={range}>{data => <>
      <p className="text-sm">Los cobros se atribuyen a quien creó el pedido.</p>
      <Table title="Ventas por usuario" headers={["Usuario", ...totalsHeaders]} rows={data.items.map(item => ({ key: item.userId ?? "unassigned", cells: [item.username ?? "Sin usuario", ...totalCells(item, format)] }))} />
    </>}</ReadReport>;
    case "payment-methods": return <ReadReport report="payment-methods" params={range}>{data => <>
      <Metrics values={totalsMetrics(data.totals, format)} /><MethodsTable data={data} format={format} />
    </>}</ReadReport>;
    case "cash-sessions": return <ReadReport report="cash-sessions" params={{ ...range, cashRegisterId: filters.cashRegisterId || undefined }}>{data =>
      <Table title="Cierres de caja" headers={["Caja", "Cerrado", "Fondo inicial", "Esperado", "Contado", "Diferencia"]} rows={data.items.map(item => ({ key: item.id,
        cells: [item.cashRegister.name, limaDateTime(item.closedAt), format(item.openingAmount), format(item.expectedAmount), format(item.actualAmount), format(item.difference)],
      }))} />
    }</ReadReport>;
  }
}

function RegisterSelect({ children }: { children: (registers: { id: string; name: string }[]) => ReactNode }) {
  const registers = useCashRegisters();
  return <>{children(registers.data ?? [])}{registers.isError && <p role="alert" className="text-error">No se pudieron cargar las cajas. Puedes consultar todos los cierres.</p>}</>;
}

export default function ReportsPage() {
  const [params] = useSearchParams();
  const tab = (Object.keys(labels) as Report[]).find(key => key === params.get("view")) ?? "dashboard";
  const [filters, setFilters] = useState<Filters>(() => ({ ...defaultRange(), groupBy: "day", limit: 20, cashRegisterId: "" }));
  const { register, handleSubmit, formState: { errors } } = useForm<Filters>({ resolver: zodResolver(schema), defaultValues: filters });
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const format: Format = value => value === null ? "—" : money.format(Number(value));
  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold">Reportes</h1><p>Ventas y cierres · horario de Lima</p></div>
    <nav aria-label="Tipos de reporte" className="flex flex-wrap gap-2">{(Object.keys(labels) as Report[]).map(key =>
      <Link key={key} className={`btn ${key === tab ? "btn-primary" : "btn-outline"}`} aria-current={key === tab ? "page" : undefined} to={`?view=${key}`}>{labels[key]}</Link>
    )}</nav>
    <form className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4" noValidate onSubmit={handleSubmit(setFilters)}>
      <label className="grid gap-1">Desde<input className="input" type="date" {...register("from")} /></label>
      <label className="grid gap-1">Hasta<input className="input" type="date" {...register("to")} /></label>
      {tab === "sales" && <label className="grid gap-1">Agrupar por<select className="select" {...register("groupBy")}><option value="day">Día</option><option value="month">Mes</option></select></label>}
      {tab === "products" && <label className="grid gap-1">Máximo de productos<input className="input w-24" type="number" min={1} max={100} {...register("limit", { valueAsNumber: true })} /></label>}
      {tab === "cash-sessions" && <RegisterSelect>{registers => <label className="grid gap-1">Caja<select className="select" {...register("cashRegisterId")}><option value="">Todas</option>{registers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</RegisterSelect>}
      <button className="btn btn-primary">Aplicar filtros</button>
      {(errors.from || errors.to || errors.limit) && <p role="alert" className="w-full text-error">{errors.from?.message || errors.to?.message || errors.limit?.message}</p>}
    </form>
    <p className="text-sm">Período consultado: {filters.from} a {filters.to} (ambos días incluidos).</p>
    <ReportBody tab={tab} filters={filters} format={format} />
  </div>;
}
