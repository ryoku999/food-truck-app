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
        <h1 className="text-3xl font-bold">Mis pedidos</h1>
        <Link className="btn btn-primary min-h-11" to="/waiter/orders/new">
          Nuevo pedido
        </Link>
      </div>
      <div className="join" role="group" aria-label="Vista de pedidos">
        <button
          className={`btn join-item min-h-11 ${view === "active" ? "btn-primary" : "btn-outline"}`}
          aria-pressed={view === "active"}
          onClick={() => {
            setView("active");
            setPage(1);
          }}
        >
          En curso
        </button>
        <button
          className={`btn join-item min-h-11 ${view === "history" ? "btn-primary" : "btn-outline"}`}
          aria-pressed={view === "history"}
          onClick={() => {
            setView("history");
            setPage(1);
          }}
        >
          Historial
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {view === "active" ? (
          <label className="label min-h-11">
            <input
              className="checkbox"
              type="checkbox"
              checked={drafts}
              onChange={(event) => {
                setDrafts(event.target.checked);
                setPage(1);
              }}
            />{" "}
            Solo borradores
          </label>
        ) : (
          <>
            <label className="grid gap-1">
              <span>Periodo (hora de Lima)</span>
              <select
                className="select min-h-11"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as typeof period);
                  setPage(1);
                }}
              >
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="custom">Rango personalizado</option>
              </select>
            </label>
            {period === "custom" && (
              <>
                <label className="grid gap-1">
                  Desde
                  <input
                    className="input min-h-11"
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
                  <input
                    className="input min-h-11"
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
        <button
          className="btn btn-outline min-h-11"
          disabled={orders.isFetching || (view === "history" && !validRange)}
          onClick={() => void orders.refetch()}
        >
          Actualizar
        </button>
      </div>
      {view === "history" && !validRange && (
        <p role="status">Selecciona un rango de fechas válido.</p>
      )}
      {orders.isLoading && <p role="status">Cargando pedidos…</p>}
      {orders.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(orders.error, "No se pudieron cargar los pedidos.")}
        </p>
      )}
      {orders.data?.items.length === 0 && <p>No hay pedidos en esta página.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.data?.items.map((order) => (
          <li
            key={order.id}
            className="card border border-base-300 bg-base-100"
          >
            <Link to={`/waiter/orders/${order.id}`} className="card-body">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title">Pedido #{order.number}</h2>
                <span className="badge badge-outline">
                  {orderLabels[order.status]}
                </span>
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
          </li>
        ))}
      </ul>
      {orders.data && orders.data.meta.pageCount > 1 && (
        <nav
          className="flex flex-wrap items-center gap-3"
          aria-label="Paginación de pedidos"
        >
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {orders.data.meta.pageCount}
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= orders.data.meta.pageCount}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
