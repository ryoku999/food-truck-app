import { useReadyOrders } from "@/infrastructure/hooks/use-orders";
import { Link } from "react-router-dom";

export default function ReadyOrderNotices() {
  const ready = useReadyOrders();
  return (
    <section aria-label="Platos y bebidas listos" aria-live="polite">
      {ready.isError && (
        <div className="flex flex-wrap items-center gap-2 pb-3 text-sm">
          <span>No se pudieron actualizar los avisos de platos listos.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void ready.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {!!ready.data?.length && (
        <ul className="space-y-2 pb-3">
          {ready.data.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-box border border-success bg-base-200 px-3 py-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {order.tables.map((table) => table.name || `Mesa ${table.number}`).join(", ") || "Sin mesa"}
                  {" · "}Pedido #{order.number}{" · "}
                  {order.status === "READY" ? "Pedido completo listo" : "Productos listos"}
                </p>
                <p className="wrap-break-word text-sm">
                  {order.items.map((item) =>
                    `${item.quantity} × ${item.productNameSnapshot}${item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ""}`,
                  ).join(", ")}
                </p>
              </div>
              <Link className="btn btn-success min-h-11" to={`/waiter/orders/${order.id}`}>
                Ver pedido
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
