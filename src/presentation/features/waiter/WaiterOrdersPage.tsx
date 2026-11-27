import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Label } from "@/presentation/components/ui/label";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Input } from "@/presentation/components/ui/input";
import { Alert } from "@/presentation/components/ui/alert";
import { Card } from "@/presentation/components/ui/card";
import { Badge } from "@/presentation/components/ui/badge";
import { useOrders } from "@/infrastructure/hooks/use-orders";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link } from "react-router-dom";
import { moneyFormatter, orderLabels, typeLabels } from "./order-labels";

const limaDay = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const limaDateTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "short",
  timeStyle: "short",
});

export default function WaiterOrdersPage() {
  const [view, setView] = useState<"active" | "history">("active");
  const [period, setPeriod] = useState<"today" | "week" | "custom">("today");
  const today = limaDay.format(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [drafts, setDrafts] = useState(false);
  const [page, setPage] = useState(1);
  const weekStart = new Date(`${today}T00:00:00Z`);
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const start =
    period === "custom"
      ? from
      : period === "week"
        ? weekStart.toISOString().slice(0, 10)
        : today;
  const end = period === "custom" ? to : today;
  const validRange = Boolean(start && end && start <= end);
  const orders = useOrders(
    {
      view,
      page,
      pageSize: 12,
      status: view === "active" && drafts ? "DRAFT" : undefined,
      from:
        view === "history" && validRange
          ? `${start}T00:00:00-05:00`
          : undefined,
      to:
        view === "history" && validRange
          ? `${end}T23:59:59.999-05:00`
          : undefined,
    },
    view === "active" || validRange,
  );
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Mis pedidos</h1>
        <Link className={buttonVariants({ className: "min-h-11" })} to="/waiter/orders/new">
          Nuevo pedido
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vista de pedidos">
        <Button
          type="submit" variant={view === "active" ? "default" : "outline"} className="min-h-11"
          aria-pressed={view === "active"}
          onClick={() => {
            setView("active");
            setPage(1);
          }}
        >
          En curso
        </Button>
        <Button
          type="submit" variant={view === "history" ? "default" : "outline"} className="min-h-11"
          aria-pressed={view === "history"}
          onClick={() => {
            setView("history");
            setPage(1);
          }}
        >
          Historial
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {view === "active" ? (
          <Label className="min-h-11">
            <input
              type="checkbox"
              checked={drafts}
              onChange={(event) => {
                setDrafts(event.target.checked);
                setPage(1);
              }}
            />{" "}
            Solo borradores
          </Label>
        ) : (
          <>
            <label className="grid gap-1">
              <span>Periodo (hora de Lima)</span>
              <NativeSelect
                className="min-h-11"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as typeof period);
                  setPage(1);
                }}
              >
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="custom">Rango personalizado</option>
              </NativeSelect>
            </label>
            {period === "custom" && (
              <>
                <label className="grid gap-1">
                  Desde
                  <Input
                    className="min-h-11"
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="grid gap-1">
                  Hasta
                  <Input
                    className="min-h-11"
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </>
            )}
          </>
        )}
        <Button
          type="submit" variant="outline" className="min-h-11"
          disabled={orders.isFetching || (view === "history" && !validRange)}
          onClick={() => void orders.refetch()}
        >
          Actualizar
        </Button>
      </div>
      {view === "history" && !validRange && (
        <p role="status">Selecciona un rango de fechas válido.</p>
      )}
      {orders.isLoading && <p role="status">Cargando pedidos…</p>}
      {orders.isError && (
        <Alert role="alert" variant="destructive">
          {apiError(orders.error, "No se pudieron cargar los pedidos.")}
        </Alert>
      )}
      {orders.data?.items.length === 0 && <p>No hay pedidos en esta página.</p>}
      <ul className="grid gap-3">
        {orders.data?.items.map((order) => (
          <Card
            key={order.id}
            as="li"
          >
            <Link to={`/waiter/orders/${order.id}`} className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg leading-snug font-semibold">Pedido #{order.number}</h2>
                <Badge variant="outline">
                  {orderLabels[order.status]}
                </Badge>
              </div>
              <p>
                {order.tables.length
                  ? order.tables
                      .map((table) => table.name || `Mesa ${table.number}`)
                      .join(", ")
                  : typeLabels[order.type]}
              </p>
              <time dateTime={order.openedAt} className="text-sm">
                {limaDateTime.format(new Date(order.openedAt))}
              </time>
              <p className="font-semibold">
                {money.format(Number(order.total))}
              </p>
            </Link>
          </Card>
        ))}
      </ul>
      {orders.data && orders.data.meta.pageCount > 1 && (
        <nav
          className="flex flex-wrap items-center gap-3"
          aria-label="Paginación de pedidos"
        >
          <Button
            type="submit" variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {page} de {orders.data.meta.pageCount}
          </span>
          <Button
            type="submit" variant="outline"
            disabled={page >= orders.data.meta.pageCount}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
