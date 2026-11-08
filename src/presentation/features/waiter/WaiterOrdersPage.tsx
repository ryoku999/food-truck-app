import { useOrders } from "@/infrastructure/hooks/use-orders";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link } from "react-router-dom";
import { moneyFormatter, orderLabels, typeLabels } from "./order-labels";

export default function WaiterOrdersPage() {
  const userId = useAuthStore(store => store.user?.id ?? "");
  const [drafts, setDrafts] = useState(false);
  const [page, setPage] = useState(1);
  const orders = useOrders({ createdById: userId, page, pageSize: 12, status: drafts ? "DRAFT" : undefined });
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Mis pedidos</h1>
      <Link className="btn btn-primary min-h-11" to="/waiter/orders/new">Nuevo pedido</Link>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <label className="label min-h-11"><input className="checkbox" type="checkbox" checked={drafts} onChange={event => { setDrafts(event.target.checked); setPage(1); }} /> Solo borradores</label>
      <button className="btn btn-outline" disabled={orders.isFetching} onClick={() => void orders.refetch()}>Actualizar</button>
    </div>
    {orders.isPending && <p role="status">Cargando pedidos…</p>}
    {orders.isError && <p role="alert" className="alert alert-error">{apiError(orders.error, "No se pudieron cargar los pedidos.")}</p>}
    {orders.data?.items.length === 0 && <p>No hay pedidos en esta página.</p>}
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {orders.data?.items.map(order => <li key={order.id} className="card border border-base-300 bg-base-100">
        <Link to={`/waiter/orders/${order.id}`} className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="card-title">Pedido #{order.number}</h2><span className="badge badge-outline">{orderLabels[order.status]}</span></div>
          <p>{order.tables.length ? order.tables.map(table => table.name || `Mesa ${table.number}`).join(", ") : typeLabels[order.type]}</p>
          <p className="font-semibold">{money.format(Number(order.total))}</p>
        </Link>
      </li>)}
    </ul>
    {orders.data && orders.data.meta.pageCount > 1 && <nav className="flex flex-wrap items-center gap-3" aria-label="Paginación de pedidos">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
      <span>Página {page} de {orders.data.meta.pageCount}</span>
      <button className="btn btn-outline" disabled={page >= orders.data.meta.pageCount} onClick={() => setPage(page + 1)}>Siguiente</button>
    </nav>}
  </div>;
}
