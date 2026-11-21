import type { OrderStatus } from "@/core/entities/order.entity";
import { useOrders } from "@/infrastructure/hooks/use-orders";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  moneyFormatter,
  orderLabels,
  typeLabels,
} from "../waiter/order-labels";

const statuses = [
  "SERVED",
  "READY",
  "IN_PROGRESS",
  "SENT",
  "PAID",
  "CANCELLED",
] as const;

export default function AccountsPage() {
  const [status, setStatus] = useState<OrderStatus>("SERVED");
  const [searchBy, setSearchBy] = useState<"order" | "ticket">("order");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const byTicket = searchBy === "ticket";
  const validTicket =
    /^\d{1,10}$/.test(input.trim()) &&
    Number(input) >= 1 &&
    Number(input) <= 2147483647;
  const orders = useOrders(
    {
      status: byTicket ? undefined : status,
      search: byTicket ? undefined : search || undefined,
      ticketNumber: byTicket ? search || undefined : undefined,
      page,
      pageSize: 15,
    },
    !byTicket || !!search,
  );
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Cuentas</h1>
        <Link className="btn btn-outline" to="../session" relative="path">
          Turno de caja
        </Link>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (byTicket && !validTicket) return;
          setSearch(input.trim());
          setPage(1);
        }}
      >
        {!byTicket && (
          <label className="grid gap-1">
            Estado
            <select
              className="select"
              value={status}
              onChange={(event) => {
                const selected = statuses.find(
                  (value) => value === event.target.value,
                );
                if (selected) {
                  setStatus(selected);
                  setPage(1);
                }
              }}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {orderLabels[value]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1">
          Buscar por
          <select
            className="select"
            value={searchBy}
            onChange={(event) => {
              setSearchBy(event.target.value === "ticket" ? "ticket" : "order");
              setInput("");
              setSearch("");
              setPage(1);
            }}
          >
            <option value="order">Pedido o cliente</option>
            <option value="ticket">N.º de ticket</option>
          </select>
        </label>
        <label className="grid grow gap-1 sm:max-w-xs">
          {byTicket ? "Número impreso en el ticket" : "Pedido o cliente"}
          <input
            className="input w-full"
            maxLength={byTicket ? 10 : 100}
            inputMode={byTicket ? "numeric" : undefined}
            placeholder={byTicket ? "000123" : undefined}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={byTicket && !validTicket}>
          Buscar
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={orders.isFetching || (byTicket && !search)}
          onClick={() => void orders.refetch()}
        >
          Actualizar
        </button>
      </form>
      {orders.isLoading && <p role="status">Cargando cuentas…</p>}
      {orders.isError && (
        <p className="alert alert-error" role="alert">
          {apiError(orders.error, "No se pudieron cargar las cuentas.")}
        </p>
      )}
      {orders.data?.items.length === 0 && (
        <p>
          {byTicket
            ? "No se encontró un pedido con ese número de ticket."
            : "No hay pedidos con este filtro."}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.data?.items.map((order) => (
          <li
            key={order.id}
            className="card border border-base-300 bg-base-100"
          >
            <Link to={order.id} className="card-body">
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
              {order.customerName && <p>{order.customerName}</p>}
              <p className="font-semibold">
                Total del pedido: {money.format(Number(order.total))}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {(page > 1 || (orders.data?.meta.pageCount ?? 0) > 1) && (
        <nav
          className="flex items-center gap-2"
          aria-label="Paginación de cuentas"
        >
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>Pág. {page}</span>
          <button
            className="btn btn-outline"
            disabled={page >= (orders.data?.meta.pageCount ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
