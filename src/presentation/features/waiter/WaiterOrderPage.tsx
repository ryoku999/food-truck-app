import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Alert } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { useConfirm } from "@/presentation/components/use-confirm";
import type { Product } from "@/core/entities/catalog.entity";
import type { Order } from "@/core/entities/order.entity";
import { useMenu } from "@/infrastructure/hooks/use-catalog";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import {
  useCommandPrintJobs,
  useOrder,
  useOrderAction,
} from "@/infrastructure/hooks/use-orders";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddItemForm, EditItemForm } from "./OrderItemForms";
import { PrintJobBadge } from "../printing/PrintJobStatus";
import { OrderForm, OrderTablesForm } from "./OrderForms";
import {
  itemLabels,
  moneyFormatter,
  orderLabels,
  typeLabels,
} from "./order-labels";

const sendTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function OrderMenu({
  order,
  money,
  close,
}: {
  order: Order;
  money: Intl.NumberFormat;
  close: () => void;
}) {
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product>();
  const menu = useMenu();
  const needle = search.trim().toLocaleLowerCase("es-PE");
  const matches = menu.data?.categories
    .map((category) => ({
      ...category,
      products: category.products.filter((item) =>
        item.name.toLocaleLowerCase("es-PE").includes(needle),
      ),
    }))
    .filter((category) => category.products.length > 0);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Carta disponible</h2>
        {!product && (
          <Button type="submit" variant="outline" onClick={close}>
            Volver a comanda
          </Button>
        )}
      </div>
      {product ? (
        <AddItemForm
          id={order.id}
          product={product}
          close={() => setProduct(undefined)}
        />
      ) : (
        <>
          <Input
            className="w-full"
            aria-label="Buscar producto"
            placeholder="Buscar producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {menu.isPending && <p role="status">Cargando carta…</p>}
          {menu.isError && (
            <Alert variant="destructive" role="alert">
              {apiError(menu.error, "No se pudo cargar la carta.")}
              <Button
                type="submit" variant="outline"
                onClick={() => void menu.refetch()}
              >
                Reintentar
              </Button>
            </Alert>
          )}
          {matches?.length === 0 && <p>No hay productos para esta búsqueda.</p>}
          {matches?.map((category) => (
            <section key={category.id} className="space-y-2">
              <h3 className="font-semibold">{category.name}</h3>
              <div className="grid gap-2">
                {category.products.map((item) => {
                  const image =
                    item.images.find((photo) => photo.isPrimary) ??
                    item.images[0];
                  return (
                    <Button
                      key={item.id}
                      type="submit" variant="outline" className="h-auto min-h-14 justify-between gap-2 py-2 text-left whitespace-normal"
                      onClick={() => setProduct(item)}
                    >
                      {image && (
                        <img
                          src={image.url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                      <span className="grow">{item.name}</span>
                      <span>{money.format(Number(item.basePrice))}</span>
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </section>
  );
}

export default function WaiterOrderPage() {
  const { orderId = "" } = useParams();
  return <OrderScreen key={orderId} id={orderId} />;
}

function OrderScreen({ id }: { id: string }) {
  const confirmAction = useConfirm();
  const query = useOrder(id);
  const action = useOrderAction();
  const actor = useAuthStore((state) => state.user?.id);
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const [editor, setEditor] = useState<
    "menu" | "details" | "tables" | { item: string }
  >();
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const order = query.data;
  const showPrinting = !!order?.sentAt && order.createdBy?.id === actor;
  const printing = useCommandPrintJobs(id, showPrinting);
  if (!order)
    return (
      <div className="space-y-3">
        <Link className={buttonVariants({ variant: "ghost" })} to="/waiter/orders">
          Volver a mis pedidos
        </Link>
        {query.isPending ? (
          <p role="status">Cargando comanda…</p>
        ) : (
          <Alert variant="destructive" role="alert">
            {apiError(query.error, "No se pudo cargar el pedido.")}
            <Button type="submit" variant="outline" onClick={() => void query.refetch()}>
              Reintentar
            </Button>
          </Alert>
        )}
      </div>
    );
  const canAppend =
    !["PAID", "CANCELLED"].includes(order.status) &&
    order.createdBy?.id === actor;
  const editable = order.status === "DRAFT" && canAppend;
  const hasTables = order.tables.length > 0;
  const orderNumber = order.number;
  const total = money.format(Number(order.total));
  const draftItems = order.items.filter((item) => item.status === "DRAFT");
  async function send() {
    if (!canAppend || action.isPending || !draftItems.length || query.isError)
      return;
    setFeedback(undefined);
    try {
      await action.mutateAsync((repo) => repo.send(id));
      setConfirm(false);
      setFeedback({ text: "Envío registrado." });
    } catch (error) {
      setConfirm(false);
      const latest = await query.refetch();
      setFeedback(
        latest.isSuccess &&
          draftItems.every((item) =>
            latest.data.items.some(
              (updated) => updated.id === item.id && updated.sentAt !== null,
            ),
          )
          ? { text: "Se confirmó el envío de los productos nuevos." }
          : {
              error: true,
              text: apiError(
                error,
                "No se confirmó el envío. Actualiza el pedido antes de volver a intentarlo.",
              ),
            },
      );
    }
  }
  async function cancelDraft() {
    if (!editable || action.isPending || query.isError) return;
    const accepted = await confirmAction({
      title: `¿Cancelar el borrador #${orderNumber}?`,
      message: hasTables
        ? "Se cancelará el pedido y se liberarán las mesas asociadas."
        : "Se cancelará el pedido y sus productos en borrador.",
      acceptLabel: "Cancelar borrador",
    });
    if (!accepted) return;

    const success = hasTables
      ? "Borrador cancelado. Las mesas asociadas quedaron disponibles."
      : "Borrador cancelado.";
    setFeedback(undefined);
    try {
      await action.mutateAsync((repo) =>
        repo.cancel(id, "Borrador cancelado por el mozo antes del envío."),
      );
      setFeedback({ text: success });
    } catch (error) {
      const latest = await query.refetch();
      setFeedback(
        latest.isSuccess && latest.data.status === "CANCELLED"
          ? { text: success }
          : {
              error: true,
              text: apiError(error, "No se pudo confirmar la cancelación."),
            },
      );
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className={buttonVariants({ variant: "ghost", className: "min-h-11" })} to="/waiter/orders">
        Mis pedidos
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">Pedido #{orderNumber}</h1>
          <Badge variant="outline">
            {orderLabels[order.status]}
          </Badge>
        </div>
        <p>
          {order.tables.length
            ? order.tables
                .map(
                  (table) =>
                    `${table.diningArea.name} · ${table.name || `Mesa ${table.number}`}`,
                )
                .join(", ")
            : typeLabels[order.type]}
        </p>
        {order.customerName && <p>Cliente: {order.customerName}</p>}
        {order.notes && <p>Notas: {order.notes}</p>}
      </div>
      {query.isError && (
        <Alert role="alert" variant="warning">
          No se pudo actualizar el pedido. Estás viendo los últimos datos
          recibidos.
        </Alert>
      )}
      {feedback && (
        <Alert
          role={feedback.error ? "alert" : "status"}
          variant={feedback.error ? "destructive" : "success"}
        >
          {feedback.text}
        </Alert>
      )}
      {showPrinting && (
        <section className="space-y-2" aria-label="Impresión de comandas">
          <h2 className="text-xl font-semibold">Impresión de comandas</h2>
          {printing.isPending && <p role="status">Consultando impresión…</p>}
          {printing.isError && (
            <p role="alert">No se pudo actualizar el estado de impresión.</p>
          )}
          {printing.isSuccess && printing.data.length === 0 && (
            <p>Este pedido no generó comandas de cocina o barra.</p>
          )}
          {!!printing.data?.length && (
            <ul className="space-y-1" aria-live="polite">
              {printing.data.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {job.type === "KITCHEN_COMMAND" ? "Cocina" : "Barra"}
                    {job.roundNumber ? ` · Ronda ${job.roundNumber}` : ""}
                  </span>
                  <PrintJobBadge job={job} />
                </li>
              ))}
            </ul>
          )}
          {printing.data?.some((job) => job.status === "FAILED") && (
            <p className="text-destructive">Pide a caja que revise la comanda fallida.</p>
          )}
        </section>
      )}
      {editable && !editor && !confirm && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit" variant="outline" className="min-h-11"
            disabled={action.isPending}
            onClick={() => setEditor("details")}
          >
            Editar datos
          </Button>
          {order.type === "DINE_IN" && (
            <Button
              type="submit" variant="outline" className="min-h-11"
              disabled={action.isPending}
              onClick={() => setEditor("tables")}
            >
              Cambiar mesas
            </Button>
          )}
          <Button
            type="button"
            variant="destructive" className="min-h-11"
            disabled={action.isPending || query.isError}
            onClick={() => void cancelDraft()}
          >
            {hasTables
              ? "Cancelar borrador y liberar mesas"
              : "Cancelar borrador"}
          </Button>
        </div>
      )}
      {editable && editor === "details" && (
        <OrderForm order={order} close={() => setEditor(undefined)} />
      )}
      {editable && editor === "tables" && (
        <OrderTablesForm order={order} close={() => setEditor(undefined)} />
      )}
      {canAppend && editor === "menu" && (
        <OrderMenu
          order={order}
          money={money}
          close={() => setEditor(undefined)}
        />
      )}
      {editor !== "menu" && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Comanda</h2>
          {!order.items.length && (
            <p>Todavía no hay productos en este pedido.</p>
          )}
          <ul className="space-y-2">
            {order.items.map((item) => (
              <Card
                key={item.id}
                as="li"
              >
                <CardContent className="gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">
                      {item.quantity} × {item.productNameSnapshot}
                      {item.variantNameSnapshot
                        ? ` · ${item.variantNameSnapshot}`
                        : ""}
                    </h3>
                    <span>
                      {money.format(Number(item.unitPrice))}
                      {item.quantity > 1 ? " c/u" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {itemLabels[item.status]}
                    </Badge>
                    {item.roundNumber && (
                      <Badge
                        variant={item.roundNumber > 1 ? "secondary" : "outline"}
                      >
                        Ronda {item.roundNumber}
                        {item.roundNumber > 1 ? " · Adicional" : ""}
                      </Badge>
                    )}
                  </div>
                  {item.sentAt ? (
                    <p className="text-sm">
                      Enviada{" "}
                      <time dateTime={item.sentAt}>
                        {sendTime.format(new Date(item.sentAt))}
                      </time>{" "}
                      · Lima
                    </p>
                  ) : (
                    <p className="text-sm">
                      {item.status === "DRAFT"
                        ? "Pendiente de envío"
                        : "Sin hora de envío registrada"}
                    </p>
                  )}
                  {item.modifiers.map((option) => (
                    <p key={option.id} className="text-sm">
                      {option.groupNameSnapshot}:{" "}
                      {option.quantity > 1 ? `${option.quantity} × ` : ""}
                      {option.optionNameSnapshot} (
                      {Number(option.priceDelta) >= 0 ? "+" : ""}
                      {money.format(Number(option.priceDelta))}
                      {option.quantity > 1 ? " c/u" : ""})
                    </p>
                  ))}
                  {item.comboSelections.map((option) => (
                    <p key={option.id} className="text-sm">
                      {option.groupNameSnapshot}: {option.productNameSnapshot} (
                      {Number(option.additionalPrice) >= 0 ? "+" : ""}
                      {money.format(Number(option.additionalPrice))})
                    </p>
                  ))}
                  <p className="font-semibold">
                    Total
                    {item.quantity > 1
                      ? ` (${item.quantity} unidades)`
                      : ""}: {money.format(Number(item.subtotal))}
                  </p>
                  {item.status === "CANCELLED" && item.cancellationReason && (
                    <p className="text-sm">
                      Motivo de cancelación: {item.cancellationReason}
                    </p>
                  )}
                  {item.notes && <p className="text-sm">Notas: {item.notes}</p>}
                  {canAppend &&
                    item.status === "DRAFT" &&
                    typeof editor === "object" &&
                    editor.item === item.id && (
                      <EditItemForm
                        id={id}
                        item={item}
                        close={() => setEditor(undefined)}
                      />
                    )}
                  {canAppend &&
                    item.status === "DRAFT" &&
                    !editor &&
                    !confirm && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="submit" variant="outline" className="min-h-11"
                          disabled={action.isPending}
                          onClick={() => setEditor({ item: item.id })}
                        >
                          Editar
                        </Button>
                        <Button
                          type="submit" variant="ghost" className="min-h-11"
                          disabled={action.isPending}
                          onClick={async () => {
                            if (
                              !(await confirmAction(
                                "¿Quitar este ítem del borrador?",
                              ))
                            )
                              return;
                            setFeedback(undefined);
                            action.mutate(
                              (repo) => repo.removeItem(id, item.id),
                              {
                                onError: (error) =>
                                  setFeedback({
                                    error: true,
                                    text: apiError(
                                      error,
                                      "No se pudo quitar el ítem.",
                                    ),
                                  }),
                              },
                            );
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </ul>
        </section>
      )}
      {confirm && canAppend && (
        <section
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          aria-label="Confirmar envío"
        >
          <h2 className="font-semibold">¿Enviar pedido #{order.number}?</h2>
          <p>
            {draftItems.reduce((sum, item) => sum + item.quantity, 0)} unidades
            nuevas ·{" "}
            {money.format(
              draftItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
            )}
            . Se enviarán solo los productos nuevos a Cocina y Barra.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit" className="min-h-11"
              disabled={action.isPending || query.isError}
              onClick={() => void send()}
            >
              {action.isPending ? "Enviando…" : "Confirmar envío"}
            </Button>
            <Button
              type="submit" variant="ghost" className="min-h-11"
              disabled={action.isPending}
              onClick={() => setConfirm(false)}
            >
              Volver a revisar
            </Button>
          </div>
        </section>
      )}
      <footer className="clay-raised sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 space-y-2 rounded-xl border bg-card p-3">
        <p className="flex justify-between font-semibold tabular-nums">
          <span>Total</span>
          <span>{total}</span>
        </p>
        {canAppend && !editor && !confirm && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 min-w-0 px-2 py-2 whitespace-normal"
              disabled={action.isPending || query.isError}
              onClick={() => setEditor("menu")}
            >
              Agregar productos
            </Button>
            <Button
              type="button"
              className="h-auto min-h-11 min-w-0 px-2 py-2 whitespace-normal"
              disabled={!draftItems.length || action.isPending || query.isError}
              onClick={() => setConfirm(true)}
            >
              Enviar productos nuevos
            </Button>
          </div>
        )}
        {query.isError && (
          <Button
            type="submit" variant="outline" className="w-full"
            onClick={() => void query.refetch()}
          >
            Actualizar pedido
          </Button>
        )}
      </footer>
    </div>
  );
}
