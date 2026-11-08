import { Link, useSearchParams } from "react-router-dom";
import { OrderForm } from "./OrderForms";

export default function NewWaiterOrderPage() {
  const [params] = useSearchParams();
  const table = params.get("table") ?? undefined;
  return <div className="mx-auto max-w-xl space-y-4">
    <Link className="btn btn-ghost min-h-11" to="/waiter/orders">Volver a mis pedidos</Link>
    <OrderForm key={table ?? "new"} initialTable={table} />
  </div>;
}
