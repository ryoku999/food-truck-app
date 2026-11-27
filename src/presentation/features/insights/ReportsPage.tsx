import { Table as DataTable, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Alert } from "@/presentation/components/ui/alert";
import { Input } from "@/presentation/components/ui/input";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Skeleton } from "@/presentation/components/ui/skeleton";
import type {
  DateRange,
  ReportParams,
  ReportResults,
  Totals,
} from "@/core/entities/insights.entity";
import { useCashRegisters } from "@/infrastructure/hooks/use-cashier";
import { useReport } from "@/infrastructure/hooks/use-insights";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarRange, CreditCard, RefreshCw, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { moneyFormatter } from "../waiter/order-labels";
import { dateMs, defaultRange, limaDateTime } from "./insights-dates";

const labels = {
  dashboard: "Resumen",
  sales: "Ventas",
  products: "Productos",
  waiters: "Mozos",
  "payment-methods": "Métodos de pago",
  "cash-sessions": "Cierres de caja",
} as const;
type Report = keyof ReportResults;
type Format = (value: string | null) => string;
const date = z.iso
  .date()
  .refine((value) => /^20/.test(value), "Usa fechas entre 2000 y 2099");
const schema = z
  .object({
    from: date,
    to: date,
    groupBy: z.enum(["day", "month"]),
    limit: z.number().int().min(1).max(100),
    cashRegisterId: z.string(),
  })
  .superRefine(({ from, to }, context) => {
    const days = (dateMs(to) - dateMs(from)) / 86400000 + 1;
    if (days < 1 || days > 366)
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Selecciona un rango válido de hasta 366 días.",
      });
  });
type Filters = z.infer<typeof schema>;
const rangeFormat = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "America/Lima",
});

function Table({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  if (!rows.length)
    return (
      <p className="rounded-xl border border-border bg-card p-4">
        Sin resultados para este rango.
      </p>
    );
  return (
    <DataTable
      containerProps={{
        className: "clay-panel rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring",
        tabIndex: 0,
        role: "region",
        "aria-label": title,
      }}
    >
        <TableCaption className="sr-only">{title}</TableCaption>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
                <TableHead key={header} scope="col" className="text-xs text-muted-foreground">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <TableHead key={index} scope="row">
                    {cell}
                  </TableHead>
                ) : (
                  <TableCell key={index} className="whitespace-nowrap tabular-nums">
                    {cell}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
    </DataTable>
  );
}

function Metrics({ values }: { values: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {values.map(([label, value]) => (
        <div
          key={label}
          className="clay-panel rounded-xl border bg-card p-3 @sm:p-4"
        >
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-2 wrap-break-word text-xl font-semibold tracking-tight tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const totalsHeaders = [
  "Cobrado",
  "Anulado",
  "Reembolsado",
  "Pagos",
  "Pedidos con cobros",
];
const totalCells = (item: Totals, format: Format) => [
  format(item.collected),
  format(item.cancelled),
  format(item.refunded),
  item.paymentCount,
  item.orderCount,
];
const totalsMetrics = (item: Totals, format: Format): [string, ReactNode][] =>
  totalsHeaders.map((header, index) => [
    header,
    totalCells(item, format)[index],
  ]);

function DashboardMetrics({
  data,
  format,
}: {
  data: ReportResults["dashboard"];
  format: Format;
}) {
  const metrics = [
    ...totalsMetrics(data, format).slice(1),
    ["Pedidos abiertos", data.openOrders],
    ["Pedidos cancelados", data.cancelledOrders],
  ];
  const surfaces = [
    "bg-clay-peach", "bg-clay-lilac", "bg-clay-mint",
    "bg-clay-gold", "bg-card", "bg-card",
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 @md:grid-cols-3 @4xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="clay-raised col-span-full flex min-w-0 flex-col justify-between gap-6 rounded-2xl bg-primary p-5 text-primary-foreground @sm:p-6 @4xl:col-span-1 @4xl:row-span-2">
        <dt className="flex items-center justify-between gap-3 text-sm font-medium">
          Cobrado
          <Wallet className="size-5 shrink-0" aria-hidden="true" />
        </dt>
        <dd className="wrap-anywhere text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-semibold tracking-tight tabular-nums">
          {format(data.collected)}
        </dd>
      </div>
      {metrics.map(([label, value], index) => (
        <div key={String(label)} className={`clay-panel min-w-0 rounded-xl border border-border/55 p-3.5 @sm:p-4 ${surfaces[index]}`}>
          <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
          <dd className="mt-2 wrap-anywhere text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ReadReport<K extends Report>({
  report,
  params,
  children,
}: {
  report: K;
  params: ReportParams[K];
  children: (data: ReportResults[K]) => ReactNode;
}) {
  const query = useReport(report, params);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{labels[report]}</h2>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={query.isFetching ? "motion-safe:animate-spin" : undefined} aria-hidden="true" />
          {query.isFetching ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>
      {query.isPending && (
        <div role="status">
          <span className="sr-only">Consultando reporte…</span>
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}
      {query.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(query.error, "No se pudo consultar el reporte.")}
        </Alert>
      )}
      {query.data && children(query.data)}
    </section>
  );
}

function MethodsTable({
  data,
  format,
}: {
  data: ReportResults["payment-methods"];
  format: Format;
}) {
  return (
    <Table
      title="Cobros por método"
      headers={["Método", ...totalsHeaders]}
      rows={data.items.map((item) => ({
        key: item.id,
        cells: [item.name, ...totalCells(item, format)],
      }))}
    />
  );
}

function PaymentBreakdown({
  data,
  format,
}: {
  data: ReportResults["payment-methods"];
  format: Format;
}) {
  const methods = data.items
    .map((method) => ({ ...method, amount: Number(method.collected) }))
    .filter(({ amount }) => Number.isFinite(amount) && amount > 0)
    .sort((first, second) => second.amount - first.amount);
  const total = methods.reduce((sum, method) => sum + method.amount, 0);
  return (
    <div className="space-y-3">
      {total > 0 && (
        <Card as="section" aria-labelledby="payment-breakdown">
          <CardContent className="gap-4">
            <h3 id="payment-breakdown" className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
              Distribución de cobros
            </h3>
            <ul className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
              {methods.map((method) => {
                const share = method.amount / total;
                return (
                  <li key={method.id} className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                      <span className="wrap-anywhere">{method.name}</span>
                      <span className="font-medium tabular-nums">
                        {format(method.collected)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {Math.round(share * 100)}%
                        </span>
                      </span>
                    </div>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-accent">
                      <div className="h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${share})` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      <MethodsTable data={data} format={format} />
    </div>
  );
}

function ReportBody({
  tab,
  filters,
  format,
}: {
  tab: Report;
  filters: Filters;
  format: Format;
}) {
  const range: DateRange = { from: filters.from, to: filters.to };
  switch (tab) {
    case "dashboard":
      return (
        <>
          <ReadReport report="dashboard" params={range}>
            {(data) => <DashboardMetrics data={data} format={format} />}
          </ReadReport>
          <ReadReport report="payment-methods" params={range}>
            {(data) => <PaymentBreakdown data={data} format={format} />}
          </ReadReport>
        </>
      );
    case "sales":
      return (
        <ReadReport
          report="sales"
          params={{ ...range, groupBy: filters.groupBy }}
        >
          {(data) => (
            <>
              <Metrics values={totalsMetrics(data.totals, format)} />
              <Table
                title="Ventas por período"
                headers={[
                  data.groupBy === "day" ? "Día" : "Mes",
                  ...totalsHeaders,
                ]}
                rows={data.items.map((item) => ({
                  key: item.period,
                  cells: [item.period, ...totalCells(item, format)],
                }))}
              />
            </>
          )}
        </ReadReport>
      );
    case "products":
      return (
        <ReadReport
          report="products"
          params={{ ...range, limit: filters.limit }}
        >
          {(data) => (
            <Table
              title="Productos vendidos"
              headers={["Producto", "Unidades", "Subtotal"]}
              rows={data.items.map((item) => ({
                key: JSON.stringify([item.productId, item.name]),
                cells: [item.name, item.quantity, format(item.subtotal)],
              }))}
            />
          )}
        </ReadReport>
      );
    case "waiters":
      return (
        <ReadReport report="waiters" params={range}>
          {(data) => (
            <>
              <p className="text-sm">
                Los cobros se atribuyen a quien creó el pedido.
              </p>
              <Table
                title="Ventas por usuario"
                headers={["Usuario", ...totalsHeaders]}
                rows={data.items.map((item) => ({
                  key: item.userId ?? "unassigned",
                  cells: [
                    item.username ?? "Sin usuario",
                    ...totalCells(item, format),
                  ],
                }))}
              />
            </>
          )}
        </ReadReport>
      );
    case "payment-methods":
      return (
        <ReadReport report="payment-methods" params={range}>
          {(data) => (
            <>
              <Metrics values={totalsMetrics(data.totals, format)} />
              <MethodsTable data={data} format={format} />
            </>
          )}
        </ReadReport>
      );
    case "cash-sessions":
      return (
        <ReadReport
          report="cash-sessions"
          params={{
            ...range,
            cashRegisterId: filters.cashRegisterId || undefined,
          }}
        >
          {(data) => (
            <Table
              title="Cierres de caja"
              headers={[
                "Caja",
                "Cerrado",
                "Fondo inicial",
                "Esperado",
                "Contado",
                "Diferencia",
              ]}
              rows={data.items.map((item) => ({
                key: item.id,
                cells: [
                  item.cashRegister.name,
                  limaDateTime(item.closedAt),
                  format(item.openingAmount),
                  format(item.expectedAmount),
                  format(item.actualAmount),
                  format(item.difference),
                ],
              }))}
            />
          )}
        </ReadReport>
      );
  }
}

function RegisterSelect({
  children,
}: {
  children: (registers: { id: string; name: string }[]) => ReactNode;
}) {
  const registers = useCashRegisters();
  return (
    <>
      {children(registers.data ?? [])}
      {registers.isError && (
        <p role="alert" className="text-destructive">
          No se pudieron cargar las cajas. Puedes consultar todos los cierres.
        </p>
      )}
    </>
  );
}

export default function ReportsPage() {
  const [params] = useSearchParams();
  const tab =
    (Object.keys(labels) as Report[]).find(
      (key) => key === params.get("view"),
    ) ?? "dashboard";
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultRange(),
    groupBy: "day",
    limit: 20,
    cashRegisterId: "",
  }));
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Filters>({
    resolver: zodResolver(schema),
    defaultValues: filters,
  });
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const format: Format = (value) =>
    value === null ? "—" : money.format(Number(value));
  const period = rangeFormat.formatRange(
    new Date(dateMs(filters.from)),
    new Date(dateMs(filters.to)),
  );
  return (
    <div className="space-y-6">
      <header className="clay-hero clay-raised flex min-h-32 flex-wrap items-end justify-between gap-3 rounded-2xl border p-5 @lg:p-7">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Reportes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Ventas, cobros y cierres de caja</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarRange className="size-4 shrink-0" aria-hidden="true" />
          {period}
        </p>
      </header>
      <nav aria-label="Tipos de reporte" className="clay-panel flex flex-wrap gap-1 rounded-xl border bg-card p-1.5">
        {(Object.keys(labels) as Report[]).map((key) => (
          <Link
            key={key}
            className={buttonVariants({
              variant: key === tab ? "secondary" : "ghost",
              size: "sm",
            })}
            aria-current={key === tab ? "page" : undefined}
            to={`?view=${key}`}
          >
            {labels[key]}
          </Link>
        ))}
      </nav>
      <form
        className="clay-panel grid grid-cols-2 items-end gap-3 rounded-xl border bg-card p-4 text-sm @md:flex @md:flex-wrap"
        noValidate
        onSubmit={handleSubmit(setFilters)}
      >
        <label className="grid min-w-0 gap-1">
          Desde
          <Input type="date" {...register("from")} />
        </label>
        <label className="grid min-w-0 gap-1">
          Hasta
          <Input type="date" {...register("to")} />
        </label>
        {tab === "sales" && (
          <label className="grid gap-1">
            Agrupar por
            <NativeSelect {...register("groupBy")}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
            </NativeSelect>
          </label>
        )}
        {tab === "products" && (
          <label className="grid gap-1">
            Máximo de productos
            <Input
              className="w-24"
              type="number"
              min={1}
              max={100}
              {...register("limit", { valueAsNumber: true })}
            />
          </label>
        )}
        {tab === "cash-sessions" && (
          <RegisterSelect>
            {(registers) => (
              <label className="grid gap-1">
                Caja
                <NativeSelect {...register("cashRegisterId")}>
                  <option value="">Todas</option>
                  {registers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
          </RegisterSelect>
        )}
        <Button type="submit" className="col-span-2">Aplicar filtros</Button>
        {(errors.from || errors.to || errors.limit) && (
          <p role="alert" className="col-span-2 w-full text-destructive">
            {errors.from?.message ||
              errors.to?.message ||
              errors.limit?.message}
          </p>
        )}
      </form>
      <ReportBody tab={tab} filters={filters} format={format} />
    </div>
  );
}
