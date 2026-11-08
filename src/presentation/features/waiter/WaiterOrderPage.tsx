import type { Product } from "@/core/entities/catalog.entity";
import type { Order } from "@/core/entities/order.entity";
import { useMenu } from "@/infrastructure/hooks/use-catalog";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { useOrder, useOrderAction } from "@/infrastructure/hooks/use-orders";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddItemForm, EditItemForm } from "./OrderItemForms";
import { OrderForm, OrderTablesForm } from "./OrderForms";
import { itemLabels, moneyFormatter, orderLabels, typeLabels } from "./order-labels";

function OrderMenu({ order, money, close }: { order: Order; money: Intl.NumberFormat; close: () => void }) {
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product>();
  const menu = useMenu();
  const needle = search.trim().toLocaleLowerCase("es-PE");
  const matches = menu.data?.categories.map(category => ({
    ...category, products: category.products.filter(item => item.name.toLocaleLowerCase("es-PE").includes(needle)),
  })).filter(category => category.products.length > 0);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">Carta disponible</h2>
      {!product && <button className="btn btn-outline" onClick={close}>Volver a comanda</button>}
    </div>
    {product ? <AddItemForm id={order.id} product={product} close={() => setProduct(undefined)} /> : <>
      <input className="input w-full" aria-label="Buscar producto" placeholder="Buscar producto" value={search} onChange={event => setSearch(event.target.value)} />
      {menu.isPending && <p role="status">Cargando carta…</p>}
      {menu.isError && <div className="alert alert-error" role="alert">{apiError(menu.error, "No se pudo cargar la carta.")}<button className="btn btn-outline" onClick={() => void menu.refetch()}>Reintentar</button></div>}
      {matches?.length === 0 && <p>No hay productos para esta búsqueda.</p>}
      {matches?.map(category => <section key={category.id} className="space-y-2">
        <h3 className="font-semibold">{category.name}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {category.products.map(item => {
            const image = item.images.find(photo => photo.isPrimary) ?? item.images[0];
            return <button key={item.id} className="btn btn-outline h-auto min-h-14 justify-between gap-2 py-2 text-left whitespace-normal" onClick={() => setProduct(item)}>
              {image && <img src={image.url} alt="" className="h-12 w-12 shrink-0 rounded-box object-cover" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
              <span className="grow">{item.name}</span><span>{money.format(Number(item.basePrice))}</span>
            </button>;
          })}
        </div>
      </section>)}
    </>}
  </section>;
}

export default function WaiterOrderPage() {
  const { orderId = "" } = useParams();
  return <OrderScreen key={orderId} id={orderId} />;
}

function OrderScreen({ id }: { id: string }) {
  const query = useOrder(id);
  const action = useOrderAction();
  const actor = useAuthStore(state => state.user?.id);
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const [editor, setEditor] = useState<"menu" | "details" | "tables" | { item: string }>();
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const order = query.data;
  if (!order) return <div className="space-y-3">
    <Link className="btn btn-ghost" to="/waiter/orders">Volver a mis pedidos</Link>
    {query.isPending ? <p role="status">Cargando comanda…</p> : <div className="alert alert-error" role="alert">{apiError(query.error, "No se pudo cargar el pedido.")}<button className="btn" onClick={() => void query.refetch()}>Reintentar</button></div>}
  </div>;
  const editable = order.status === "DRAFT" && order.createdBy?.id === actor;
  const total = money.format(Number(order.total));
  const liveItems = order.items.filter(item => item.status !== "CANCELLED");
  async function send() {
    if (!editable || action.isPending || !liveItems.length) return;
    setFeedback(undefined);
    try {
      await action.mutateAsync(repo => repo.send(id));
      setConfirm(false);
      setFeedback({ text: "Comanda enviada." });
    } catch (error) {
      setConfirm(false);
      const latest = await query.refetch();
      setFeedback(latest.isSuccess && latest.data.status !== "DRAFT"
        ? { text: `Estado confirmado: ${orderLabels[latest.data.status]}.` }
        : { error: true, text: apiError(error, "No se confirmó el envío. Actualiza el pedido antes de volver a intentarlo.") });
    }
  }
  return <div className="mx-auto max-w-3xl space-y-4">
    <Link className="btn btn-ghost min-h-11" to="/waiter/orders">Mis pedidos</Link>
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold">Pedido #{order.number}</h1><span className="badge badge-outline">{orderLabels[order.status]}</span></div>
      <p>{order.tables.length ? order.tables.map(table => `${table.diningArea.name} · ${table.name || `Mesa ${table.number}`}`).join(", ") : typeLabels[order.type]}</p>
      {order.customerName && <p>Cliente: {order.customerName}</p>}
      {order.notes && <p>Notas: {order.notes}</p>}
    </div>
    {query.isError && <p role="alert" className="alert alert-warning">No se pudo actualizar el pedido. Estás viendo los últimos datos recibidos.</p>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className={`alert ${feedback.error ? "alert-error" : "alert-success"}`}>{feedback.text}</p>}
    {editable && !editor && !confirm && <div className="flex flex-wrap gap-2">
      <button className="btn btn-outline min-h-11" disabled={action.isPending} onClick={() => setEditor("details")}>Editar datos</button>
      {order.type === "DINE_IN" && <button className="btn btn-outline min-h-11" disabled={action.isPending} onClick={() => setEditor("tables")}>Cambiar mesas</button>}
    </div>}
    {editable && editor === "details" && <OrderForm order={order} close={() => setEditor(undefined)} />}
    {editable && editor === "tables" && <OrderTablesForm order={order} close={() => setEditor(undefined)} />}
    {editable && editor === "menu" && <OrderMenu order={order} money={money} close={() => setEditor(undefined)} />}
    {editor !== "menu" && <section className="space-y-2">
      <h2 className="text-xl font-semibold">Comanda</h2>
      {!order.items.length && <p>Todavía no hay productos en este pedido.</p>}
      <ul className="space-y-2">
        {order.items.map(item => <li key={item.id} className="card border border-base-300 bg-base-100"><div className="card-body gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{item.quantity} × {item.productNameSnapshot}{item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ""}</h3>
            <span>{money.format(Number(item.subtotal))}</span>
          </div>
          <span className="badge badge-outline">{itemLabels[item.status]}</span>
          {item.modifiers.map(option => <p key={option.id} className="text-sm">{option.groupNameSnapshot}: {option.optionNameSnapshot}</p>)}
          {item.comboSelections.map(option => <p key={option.id} className="text-sm">{option.groupNameSnapshot}: {option.productNameSnapshot}</p>)}
          {item.notes && <p className="text-sm">Notas: {item.notes}</p>}
          {editable && typeof editor === "object" && editor.item === item.id && <EditItemForm id={id} item={item} close={() => setEditor(undefined)} />}
          {editable && !editor && !confirm && <div className="card-actions">
            <button className="btn btn-outline min-h-11" disabled={action.isPending} onClick={() => setEditor({ item: item.id })}>Editar</button>
            <button className="btn btn-ghost min-h-11" disabled={action.isPending} onClick={() => {
              if (!window.confirm("¿Quitar este ítem del borrador?")) return;
              setFeedback(undefined);
              action.mutate(repo => repo.removeItem(id, item.id), { onError: error => setFeedback({ error: true, text: apiError(error, "No se pudo quitar el ítem.") }) });
            }}>Quitar</button>
          </div>}
        </div></li>)}
      </ul>
    </section>}
    {confirm && editable && <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4" aria-label="Confirmar envío">
      <h2 className="font-semibold">¿Enviar pedido #{order.number}?</h2>
      <p>{liveItems.reduce((sum, item) => sum + item.quantity, 0)} unidades · {total}. Al enviarlo se cierra la edición del borrador.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary min-h-11" disabled={action.isPending || query.isError} onClick={() => void send()}>{action.isPending ? "Enviando…" : "Confirmar envío"}</button>
        <button className="btn btn-ghost min-h-11" disabled={action.isPending} onClick={() => setConfirm(false)}>Volver a revisar</button>
      </div>
    </section>}
    <footer className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 space-y-2 rounded-box border border-base-300 bg-base-100 p-3">
      <p className="flex justify-between font-bold"><span>Total</span><span>{total}</span></p>
      {editable && !editor && !confirm && <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-outline min-h-11" disabled={action.isPending || query.isError} onClick={() => setEditor("menu")}>Agregar productos</button>
        <button className="btn btn-primary min-h-11" disabled={!liveItems.length || action.isPending || query.isError} onClick={() => setConfirm(true)}>Revisar y enviar</button>
      </div>}
      {query.isError && <button className="btn btn-outline w-full" onClick={() => void query.refetch()}>Actualizar pedido</button>}
    </footer>
  </div>;
}
