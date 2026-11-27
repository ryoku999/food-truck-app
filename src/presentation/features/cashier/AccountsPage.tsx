import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Input } from "@/presentation/components/ui/input";
import { Alert } from "@/presentation/components/ui/alert";
import { Card } from "@/presentation/components/ui/card";
import { Badge } from "@/presentation/components/ui/badge";
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
  "SENT",
  "PAID",
  "CANCELLED",
] as const;

export default function AccountsPage() {
  const [status, setStatus] = useState<OrderStatus>("SENT");
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
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Cuentas</h1>
        <Link className={buttonVariants({ variant: "outline" })} to="../session" relative="path">
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
            <NativeSelect
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
            </NativeSelect>
          </label>
        )}
        <label className="grid gap-1">
          Buscar por
          <NativeSelect
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
          </NativeSelect>
        </label>
        <label className="grid grow gap-1 sm:max-w-xs">
          {byTicket ? "Número impreso en el ticket" : "Pedido o cliente"}
          <Input
            className="w-full"
            maxLength={byTicket ? 10 : 100}
            inputMode={byTicket ? "numeric" : undefined}
            placeholder={byTicket ? "000123" : undefined}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={byTicket && !validTicket}>
          Buscar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={orders.isFetching || (byTicket && !search)}
          onClick={() => void orders.refetch()}
        >
          Actualizar
        </Button>
      </form>
      {orders.isLoading && <p role="status">Cargando cuentas…</p>}
      {orders.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(orders.error, "No se pudieron cargar las cuentas.")}
        </Alert>
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
          <Card
            key={order.id}
            as="li"
          >
            <Link to={order.id} className="flex flex-col gap-4 p-4 sm:p-5">
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
              {order.customerName && <p>{order.customerName}</p>}
              <p className="font-semibold">
                Total del pedido: {money.format(Number(order.total))}
              </p>
            </Link>
          </Card>
        ))}
      </ul>
      {(page > 1 || (orders.data?.meta.pageCount ?? 0) > 1) && (
        <nav
          className="flex items-center gap-2"
          aria-label="Paginación de cuentas"
        >
          <Button
            type="submit" variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>Pág. {page}</span>
          <Button
            type="submit" variant="outline"
            disabled={page >= (orders.data?.meta.pageCount ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
