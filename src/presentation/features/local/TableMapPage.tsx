import type { TableStatus } from "@/core/entities/local.entity";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { useDiningAreas, useLocalActions, useTableMap } from "@/infrastructure/hooks/use-local";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link } from "react-router-dom";

const statuses: Record<TableStatus, { label: string; badge: string }> = {
  AVAILABLE: { label: "Disponible", badge: "badge-success" },
  OCCUPIED: { label: "Ocupada", badge: "badge-warning" },
  DISABLED: { label: "Deshabilitada", badge: "badge-ghost" },
};

export default function TableMapPage() {
  const role = useAuthStore(state => state.user?.userRole);
  const canManage = role === "ADMIN" || role === "MANAGER";
  const canChangeStatus = canManage || role === "CASHIER";
  const [area, setArea] = useState("");
  const [inactive, setInactive] = useState(false);
  const areas = useDiningAreas();
  const map = useTableMap(area || undefined, inactive && canManage);
  const business = useBusiness();
  const { status } = useLocalActions();
  const currency = business.data?.currencyCode ?? "PEN";
  const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "PEN" });
  return <div className="space-y-5">
    <h1 className="text-3xl font-bold">Mapa de mesas</h1>
    <div className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4">
      <label className="grid gap-1">Área<select className="select w-full" value={area} onChange={event => setArea(event.target.value)}>
        <option value="">Todas las áreas</option>
        {areas.data?.filter(item => item.active || inactive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      {canManage && <label className="label min-h-11"><input className="checkbox" type="checkbox" checked={inactive} onChange={event => {
        setInactive(event.target.checked);
        setArea("");
      }} /> Incluir inactivas</label>}
      <button className="btn btn-outline" disabled={map.isFetching} onClick={() => void map.refetch()}>Actualizar</button>
    </div>
    {areas.isError && <p className="text-sm text-error" role="alert">No se pudo cargar el filtro por área.</p>}
    {status.isError && <p className="alert alert-error" role="alert">{apiError(status.error, "No se pudo cambiar el estado.")}</p>}
    {map.isPending && <p role="status">Cargando mesas…</p>}
    {map.isError && <p className="alert alert-error" role="alert">{apiError(map.error, "No se pudo cargar el mapa.")}</p>}
    {map.data?.areas.length === 0 && <p>No hay áreas para este filtro.</p>}
    {map.data?.areas.map(section => <section key={section.id} className="space-y-3">
      <h2 className="text-xl font-semibold">{section.name}{section.active ? "" : " (inactiva)"}</h2>
      {section.tables.length === 0 && <p>Esta área aún no tiene mesas visibles.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.tables.map(table => {
          const order = table.openOrder;
          const joined = order?.joinedTables.filter(item => item.id !== table.id) ?? [];
          return <li key={table.id} className="card border border-base-300 bg-base-100">
            <div className="card-body gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="card-title">{table.name || `Mesa ${table.number}`}</h3>
                <span className={`badge ${table.active ? statuses[table.status].badge : "badge-ghost"}`}>{table.active ? statuses[table.status].label : "Inactiva"}</span>
              </div>
              {table.capacity != null && <p>{table.capacity} personas</p>}
              {order && <div className="rounded-box bg-base-200 p-3">
                <p className="font-semibold">Pedido #{order.number} · {money.format(Number(order.total))}</p>
                {joined.length > 0 && <p className="text-sm">Unida a {joined.map(item => `${item.name || `Mesa ${item.number}`} (${item.diningArea.name})`).join(", ")}</p>}
              </div>}
              {role === "WAITER" && (order ? <Link className="btn btn-outline min-h-11" to={`/waiter/orders/${order.id}`}>Ver pedido</Link> :
                section.active && table.active && table.status === "AVAILABLE" && <Link className="btn btn-primary min-h-11" to={`/waiter/orders/new?table=${encodeURIComponent(table.id)}`}>Tomar pedido</Link>)}
              {canChangeStatus && section.active && table.active && !order && table.status !== "OCCUPIED" && <button className="btn btn-outline min-h-11 self-start" disabled={status.isPending} onClick={() => {
                const next = table.status === "DISABLED" ? "AVAILABLE" : "DISABLED";
                status.mutate({ id: table.id, status: next });
              }}>{table.status === "DISABLED" ? "Habilitar mesa" : "Deshabilitar mesa"}</button>}
            </div>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
