import { CancelOrderForm } from "./CancelOrderForm";
import type {
  OrderPayments,
  Payment,
  ProductSelection,
} from "@/core/entities/cashier.entity";
import {
  useBillParts,
  useCashRegisters,
  useCashierAction,
  useOrderPayments,
  usePaymentMethods,
} from "@/infrastructure/hooks/use-cashier";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { useOrder } from "@/infrastructure/hooks/use-orders";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { moneyFormatter, orderLabels } from "../waiter/order-labels";
import { amountNumber, amountRule, cents } from "./cashier-fields";
import { TicketPanel } from "../printing/TicketPanel";
import { BillDocumentButton } from "../printing/BillDocumentButton";
import { BillPartsPanel } from "./BillPartsPanel";

const paymentSchema = z.object({
  methodId: z.uuid("Selecciona un método"),
  registerId: z.uuid("Selecciona una caja"),
  amount: amountRule.refine(
    (value) => cents(value) > 0,
    "Ingresa un importe mayor a cero",
  ),
  received: z.string().trim(),
  reference: z.string().trim().max(150),
  notes: z.string().trim().max(500),
});
const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Indica el motivo de la anulación").max(500),
});
const labels = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Anulado",
  REFUNDED: "Reembolsado",
};

function PaymentForm({
  id,
  summary,
  blocked,
  format,
  part,
  selection,
  back,
  onPaid,
}: {
  id: string;
  summary: OrderPayments["summary"];
  blocked: boolean;
  format: (value: string) => string;
  part?: { id: string; name: string; pending: string };
  selection?: ProductSelection;
  back?: () => void;
  onPaid?: (payment: Payment) => void;
}) {
  const methods = usePaymentMethods();
  const registers = useCashRegisters();
  const action = useCashierAction<Payment>();
  const [notice, setNotice] = useState("");
  const {
    register,
    control,
    setValue,
    reset,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      methodId: "",
      registerId: "",
      amount: selection?.expectedTotal ?? "",
      received: "",
      reference: "",
      notes: "",
    },
  });
  const methodId = useWatch({ control, name: "methodId" });
  const method = methods.data?.find(
    (item) => item.id === methodId && item.active,
  );
  const cash = method?.code === "CASH";
  const applied = useWatch({ control, name: "amount" });
  const received = useWatch({ control, name: "received" });
  const validApplied =
    amountRule.safeParse(applied).success && cents(applied) > 0;
  const validReceived =
    amountRule.safeParse(received).success && cents(received) > 0;
  const change =
    validApplied && validReceived ? cents(received) - cents(applied) : null;
  const open =
    registers.data?.filter((item) => item.active && item.currentSession) ?? [];
  const pending = selection?.expectedTotal ?? part?.pending ?? summary.pending;
  return (
    <form
      className="card border border-base-300 bg-base-100"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        if (blocked || !method || methods.isError) return;
        setNotice("");
        if (cents(values.amount) > cents(pending)) {
          setError("amount", {
            message:
              part || selection
                ? "El monto supera el saldo de los productos seleccionados."
                : "El monto supera el saldo pendiente.",
          });
          return;
        }
        if (
          cash &&
          (!amountRule.safeParse(values.received).success ||
            cents(values.received) < cents(values.amount))
        ) {
          setError("received", {
            message:
              "Ingresa el efectivo recibido, mayor o igual al monto aplicado.",
          });
          return;
        }
        const sessionId = open.find((item) => item.id === values.registerId)
          ?.currentSession?.id;
        if (!sessionId || registers.isError) {
          setError("registerId", {
            message: "Selecciona una caja con turno abierto.",
          });
          return;
        }
        try {
          const payment = await action.mutateAsync((repo) =>
            repo.pay(id, {
              paymentMethodId: values.methodId,
              amount: amountNumber(values.amount),
              cashSessionId: sessionId,
              reference: values.reference || undefined,
              notes: values.notes || undefined,
              receivedAmount: cash ? amountNumber(values.received) : undefined,
              billPartId: part?.id,
              productSelection: selection,
            }),
          );
          setNotice(
            payment.changeAmount === null
              ? "Pago registrado."
              : `Pago registrado. Vuelto confirmado: ${format(payment.changeAmount)}.`,
          );
          reset({
            ...values,
            amount: "",
            received: "",
            reference: "",
            notes: "",
          });
          onPaid?.(payment);
        } catch (error) {
          setError("root", {
            message: apiError(
              error,
              "No se confirmó el pago. Comprueba el historial y el saldo antes de repetirlo.",
            ),
          });
        }
      })}
    >
      <div className="card-body">
        <h2 className="card-title">
          {selection
            ? selection.name
              ? `Cobrar a ${selection.name}`
              : "Cobrar productos seleccionados"
            : part
              ? `Cobrar a ${part.name}`
              : "Abonar por monto"}
        </h2>
        {selection && (
          <p>
            Total de la selección: <strong>{format(pending)}</strong>
          </p>
        )}
        {part && (
          <p>
            Pendiente de esta parte: <strong>{format(pending)}</strong>
          </p>
        )}
        <p>
          Para un pago mixto, registra cada parte por separado y revisa el saldo
          confirmado antes de continuar.
        </p>
        <label className="grid gap-1">
          Método
          <select className="select w-full" {...register("methodId")}>
            <option value="">Selecciona un método</option>
            {methods.data
              ?.filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        {methods.isError && (
          <p role="alert" className="text-error">
            No se pudieron cargar los métodos.
          </p>
        )}
        {methods.isSuccess && !methods.data.some((item) => item.active) && (
          <p>No hay métodos activos.</p>
        )}
        <label className="grid gap-1">
          Turno al que se abonará el pago
          <select className="select w-full" {...register("registerId")}>
            <option value="">Selecciona una caja</option>
            {open.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {registers.isError && (
          <p role="alert" className="text-error">
            No se pudieron consultar los turnos.
          </p>
        )}
        {registers.isSuccess && open.length === 0 && (
          <p>Abre un turno antes de registrar un pago.</p>
        )}
        {method && (
          <p className="text-sm">
            {method.code === "CASH"
              ? "Este pago también aumenta el efectivo esperado."
              : "Este pago suma al turno sin cambiar el efectivo esperado."}
          </p>
        )}
        <label className="grid gap-1">
          {cash ? "Monto aplicado a la cuenta" : "Monto exacto del pago"}
          <input
            className="input w-full"
            inputMode="decimal"
            {...register("amount")}
          />
        </label>
        <button
          type="button"
          className="btn btn-outline self-start"
          disabled={isSubmitting || blocked}
          onClick={() => setValue("amount", pending, { shouldValidate: true })}
        >
          Usar saldo pendiente
        </button>
        {cash && (
          <div className="space-y-2 rounded-box bg-base-200 p-3">
            <label className="grid gap-1">
              Efectivo recibido
              <input
                className="input w-full"
                inputMode="decimal"
                aria-invalid={!!errors.received}
                {...register("received")}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              disabled={!validApplied || isSubmitting || blocked}
              onClick={() => setValue("received", applied)}
            >
              Recibí el monto exacto
            </button>
            <p className="font-semibold" aria-live="polite">
              Vuelto:{" "}
              {change !== null && change >= 0
                ? format((change / 100).toFixed(2))
                : "—"}
            </p>
            {change !== null && change < 0 && (
              <p className="text-error">
                El efectivo recibido es insuficiente para este abono.
              </p>
            )}
          </div>
        )}
        <label className="grid gap-1">
          Referencia (opcional)
          <input
            className="input w-full"
            maxLength={150}
            {...register("reference")}
          />
        </label>
        <label className="grid gap-1">
          Notas (opcional)
          <textarea
            className="textarea w-full"
            maxLength={500}
            {...register("notes")}
          />
        </label>
        {(errors.methodId ||
          errors.registerId ||
          errors.amount ||
          (cash && errors.received) ||
          errors.root) && (
          <p role="alert" className="alert alert-error">
            {errors.methodId?.message ||
              errors.registerId?.message ||
              errors.amount?.message ||
              (cash && errors.received?.message) ||
              errors.root?.message}
          </p>
        )}
        {notice && (
          <p role="status" className="alert alert-success">
            {notice}
          </p>
        )}
        <button
          className="btn btn-primary min-h-11"
          disabled={
            isSubmitting ||
            blocked ||
            !method ||
            methods.isError ||
            open.length === 0 ||
            registers.isError
          }
        >
          {isSubmitting ? "Registrando…" : "Confirmar pago"}
        </button>
        {back && (
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            disabled={isSubmitting}
            onClick={back}
          >
            Volver a los productos
          </button>
        )}
      </div>
    </form>
  );
}

function CancelPaymentForm({
  payment,
  close,
}: {
  payment: Payment;
  close: () => void;
}) {
  const action = useCashierAction();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });
  return (
    <form
      className="space-y-2"
      onSubmit={handleSubmit(async ({ reason }) => {
        try {
          await action.mutateAsync((repo) => repo.cancel(payment.id, reason));
          close();
        } catch {
          /* API error is shown below. */
        }
      })}
    >
      <label className="grid gap-1">
        Motivo de anulación
        <textarea
          className="textarea w-full"
          maxLength={500}
          {...register("reason")}
        />
      </label>
      {errors.reason && <p className="text-error">{errors.reason.message}</p>}
      {action.isError && (
        <p role="alert" className="alert alert-error">
          {apiError(
            action.error,
            "No se confirmó la anulación. Revisa el historial.",
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-error" disabled={isSubmitting}>
          Confirmar anulación
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={isSubmitting}
          onClick={close}
        >
          Volver
        </button>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { orderId = "" } = useParams();
  return <Account key={orderId} id={orderId} />;
}

function Account({ id }: { id: string }) {
  const order = useOrder(id);
  const payments = useOrderPayments(id);
  const parts = useBillParts(id);
  const business = useBusiness();
  const [cancelItemId, setCancelItemId] = useState<string>();
  const [cancelOrder, setCancelOrder] = useState(false);
  const [cancelNotice, setCancelNotice] = useState("");
  const role = useAuthStore((state) => state.user?.userRole);
  const canCancel =
    role === "ADMIN" || role === "MANAGER" || role === "CASHIER";
  const [cancelId, setCancelId] = useState<string>();
  const [partId, setPartId] = useState<string>();
  const [selection, setSelection] = useState<ProductSelection>();
  const [pickerVersion, setPickerVersion] = useState(0);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [mode, setMode] = useState<"amount" | "products">("amount");
  const privileged = useAuthStore(
    (state) =>
      state.user?.userRole === "ADMIN" || state.user?.userRole === "MANAGER",
  );
  const money = moneyFormatter(business.data?.currencyCode);
  const format = (value: string) => money.format(Number(value));
  const summary = payments.data?.summary;
  const current = order.data;
  const cancelItem = current?.items.find(
    (item) =>
      item.id === cancelItemId &&
      !["CANCELLED", "SERVED"].includes(item.status),
  );
  const cancelling =
    payments.data?.items.some(
      (item) => item.id === cancelId && item.status === "COMPLETED",
    ) ?? false;
  const hasDraftItems =
    current?.items.some((item) => item.status === "DRAFT") ?? false;
  const payable =
    !hasDraftItems &&
    current &&
    !["DRAFT", "CANCELLED", "PAID"].includes(current.status) &&
    summary &&
    cents(summary.pending) > 0;
  const split = !!parts.data?.parts.length;
  const selected = parts.data?.parts.find(
    (part) => part.id === partId && cents(part.pending) > 0,
  );
  const productMode = split || (mode === "products" && parts.data?.canSplit);
  const blocked = payments.isError || order.isError || parts.isError;
  return (
    <div className="space-y-4">
      <Link className="btn btn-ghost" to=".." relative="path">
        Volver a cuentas
      </Link>
      {(order.isPending || payments.isPending) && (
        <p role="status">Cargando cuenta…</p>
      )}
      {(order.isError || payments.isError) && (
        <div role="alert" className="alert alert-error">
          {apiError(
            order.error ?? payments.error,
            "No se pudo actualizar la cuenta.",
          )}
          <button
            className="btn"
            onClick={() => {
              void order.refetch();
              void payments.refetch();
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {current && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">Cuenta #{current.number}</h1>
            <span className="badge badge-outline">
              {orderLabels[current.status]}
            </span>
          </div>
          {current.customerName && <p>{current.customerName}</p>}
          <p>
            {current.tables
              .map((table) => table.name || `Mesa ${table.number}`)
              .join(", ")}
          </p>
        </div>
      )}
      {summary && (
        <dl className="sticky top-0 z-10 grid grid-cols-3 gap-2 rounded-box border border-base-300 bg-base-100 p-3 text-sm sm:text-base">
          <div>
            <dt>Total</dt>
            <dd className="font-bold">{format(summary.orderTotal)}</dd>
          </div>
          <div>
            <dt>Pagado</dt>
            <dd className="font-bold">{format(summary.paid)}</dd>
          </div>
          <div>
            <dt>Pendiente</dt>
            <dd className="font-bold">{format(summary.pending)}</dd>
          </div>
        </dl>
      )}
      {hasDraftItems && (
        <p role="status" className="alert alert-warning">
          Hay productos nuevos sin enviar. Pide al mozo que envíe la comanda
          antes de cobrar.
        </p>
      )}
      {cancelNotice && (
        <p role="status" className="alert alert-success">
          {cancelNotice}
        </p>
      )}
      {current &&
        canCancel &&
        !["PAID", "CANCELLED"].includes(current.status) &&
        (cancelOrder ? (
          <CancelOrderForm
            id={id}
            number={current.number}
            close={() => setCancelOrder(false)}
            complete={() => {
              setCancelOrder(false);
              setCancelId(undefined);
              setPartId(undefined);
              setSelection(undefined);
              setSelectionNotice("");
              setCancelNotice(
                "Pedido cancelado. Las mesas asociadas quedaron liberadas.",
              );
            }}
          />
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-error btn-outline min-h-11"
              disabled={
                blocked ||
                !payments.isSuccess ||
                !parts.isSuccess ||
                cancelling ||
                !!cancelItem ||
                split ||
                payments.data.items.some(
                  (payment) => payment.status === "COMPLETED",
                )
              }
              onClick={() => {
                setCancelNotice("");
                setCancelOrder(true);
              }}
            >
              Cancelar pedido y liberar mesas
            </button>
            {(split ||
              payments.data?.items.some(
                (payment) => payment.status === "COMPLETED",
              )) && (
              <p className="text-sm">
                Para cancelar productos o el pedido, primero anula los pagos y
                libera sus partes de cuenta.
              </p>
            )}
          </div>
        ))}
      {current &&
        canCancel &&
        cancelItem &&
        !["DRAFT", "PAID", "CANCELLED"].includes(current.status) && (
          <CancelOrderForm
            key={cancelItem.id}
            id={id}
            number={current.number}
            item={{
              id: cancelItem.id,
              name:
                cancelItem.productNameSnapshot +
                (cancelItem.variantNameSnapshot
                  ? ` · ${cancelItem.variantNameSnapshot}`
                  : ""),
              quantity: cancelItem.quantity,
            }}
            close={() => setCancelItemId(undefined)}
            complete={() => {
              setCancelItemId(undefined);
              setSelection(undefined);
              setPartId(undefined);
              setSelectionNotice("");
              setPickerVersion((version) => version + 1);
              setCancelNotice(
                "Producto cancelado. El total del pedido fue recalculado.",
              );
            }}
          />
        )}
      <div
        className={
          (cancelOrder || cancelItem) &&
          current &&
          !["PAID", "CANCELLED"].includes(current.status)
            ? "hidden"
            : "grid items-start gap-4 lg:grid-cols-2"
        }
      >
        <div className="space-y-4">
          {parts.isPending && <p role="status">Cargando división de cuenta…</p>}
          {parts.isError && (
            <div className="alert alert-error" role="alert">
              {apiError(parts.error, "No se pudo consultar la división.")}
              <button className="btn" onClick={() => void parts.refetch()}>
                Reintentar
              </button>
            </div>
          )}
          {payable && parts.data?.canSplit && !split && !cancelling && (
            <nav
              aria-label="Modalidad de cobro"
              className="flex flex-wrap gap-2"
            >
              <button
                className={`btn ${!productMode ? "btn-primary" : "btn-outline"}`}
                aria-pressed={!productMode}
                onClick={() => {
                  setSelection(undefined);
                  setMode("amount");
                }}
              >
                Abonar por monto
              </button>
              <button
                className={`btn ${productMode ? "btn-primary" : "btn-outline"}`}
                aria-pressed={!!productMode}
                onClick={() => setMode("products")}
              >
                Pagar productos
              </button>
            </nav>
          )}
          {payable &&
            !split &&
            payments.data?.items.some(
              (payment) =>
                payment.status === "COMPLETED" && !payment.billPartId,
            ) && (
              <p className="text-sm">
                Esta cuenta ya tiene abonos por monto. Continúa por monto para
                conservar el historial de cobros.
              </p>
            )}
          {selectionNotice && (
            <p className="alert alert-success" role="status">
              {selectionNotice}
            </p>
          )}
          {parts.data && productMode && (
            <BillPartsPanel
              key={pickerVersion}
              id={id}
              bill={parts.data}
              selected={selected?.id}
              select={(id) => {
                setSelection(undefined);
                setPartId(id);
              }}
              editable={!!payable}
              blocked={blocked || cancelling || !!selection}
              format={format}
              choose={(value) => {
                setSelectionNotice("");
                setPartId(undefined);
                setSelection(value);
              }}
              showPicker={!selection && !selected}
            />
          )}
          {payable &&
            summary &&
            parts.isSuccess &&
            !cancelling &&
            (!productMode || selected || selection) && (
              <PaymentForm
                key={selection ? "direct" : (selected?.id ?? "amount")}
                id={id}
                summary={summary}
                blocked={blocked}
                format={format}
                part={selected}
                selection={selection}
                back={
                  productMode
                    ? () => {
                        setSelection(undefined);
                        setPartId(undefined);
                      }
                    : undefined
                }
                onPaid={
                  selection
                    ? (payment) => {
                        setSelection(undefined);
                        setPickerVersion((version) => version + 1);
                        setPartId(payment.billPartId ?? undefined);
                        setSelectionNotice(
                          payment.changeAmount == null
                            ? "Pago por productos registrado."
                            : `Pago registrado. Vuelto confirmado: ${format(payment.changeAmount)}.`,
                        );
                      }
                    : undefined
                }
              />
            )}
        </div>
        <div className="space-y-4">
          {current && canCancel && (
            <TicketPanel
              kind="prebill"
              orderId={id}
              enabled={
                !blocked &&
                !hasDraftItems &&
                !["DRAFT", "PAID", "CANCELLED"].includes(current.status)
              }
            />
          )}
          {current && (
            <TicketPanel
              orderId={id}
              enabled={
                current.status === "PAID" &&
                !order.isError &&
                !payments.isError &&
                summary != null &&
                cents(summary.pending) === 0
              }
            />
          )}
          {current && (
            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="mb-2 text-xl font-semibold">Detalle del pedido</h2>
              <ul className="space-y-3">
                {current.items.map((item) => (
                  <li
                    className="space-y-1 border-b border-base-300 pb-2"
                    key={item.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>
                        {item.quantity} × {item.productNameSnapshot}
                        {item.variantNameSnapshot
                          ? ` · ${item.variantNameSnapshot}`
                          : ""}
                        {item.status === "CANCELLED" ? " (cancelado)" : ""}
                      </span>
                      <span>
                        {format(item.unitPrice)}
                        {item.quantity > 1 ? " c/u" : ""}
                      </span>
                    </div>
                    {item.modifiers.map((option) => (
                      <p key={option.id} className="text-sm">
                        {option.groupNameSnapshot}:{" "}
                        {option.quantity > 1 ? `${option.quantity} × ` : ""}
                        {option.optionNameSnapshot} (
                        {Number(option.priceDelta) >= 0 ? "+" : ""}
                        {format(option.priceDelta)}
                        {option.quantity > 1 ? " c/u" : ""})
                      </p>
                    ))}
                    {item.comboSelections.map((option) => (
                      <p key={option.id} className="text-sm">
                        {option.groupNameSnapshot}: {option.productNameSnapshot}{" "}
                        ({Number(option.additionalPrice) >= 0 ? "+" : ""}
                        {format(option.additionalPrice)})
                      </p>
                    ))}
                    <p className="font-semibold">
                      {item.status === "CANCELLED"
                        ? "Importe cancelado"
                        : "Total"}
                      {item.quantity > 1 ? ` (${item.quantity} unidades)` : ""}:{" "}
                      {format(item.subtotal)}
                    </p>
                    {item.status === "CANCELLED" && item.cancellationReason && (
                      <p className="text-sm">
                        Motivo de cancelación: {item.cancellationReason}
                      </p>
                    )}
                    {canCancel &&
                      !["DRAFT", "PAID", "CANCELLED"].includes(
                        current.status,
                      ) &&
                      !["CANCELLED", "SERVED"].includes(item.status) && (
                        <button
                          type="button"
                          className="btn btn-error btn-outline min-h-11"
                          disabled={
                            blocked ||
                            !payments.isSuccess ||
                            !parts.isSuccess ||
                            cancelling ||
                            split ||
                            payments.data.items.some(
                              (payment) => payment.status === "COMPLETED",
                            )
                          }
                          onClick={() => {
                            setCancelNotice("");
                            setCancelItemId(item.id);
                          }}
                        >
                          Cancelar producto
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
            <h2 className="text-xl font-semibold">Historial de pagos</h2>
            {payments.data?.items.length === 0 && <p>Sin pagos registrados.</p>}
            {payments.data?.items.map((payment) => (
              <div
                key={payment.id}
                className="space-y-2 border-t border-base-300 pt-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {payment.paymentMethod.name} · {format(payment.amount)}
                  </span>
                  <span className="badge badge-outline">
                    {labels[payment.status]}
                  </span>
                </div>
                {payment.reference && (
                  <p className="text-sm">Referencia: {payment.reference}</p>
                )}
                {payment.receivedAmount != null &&
                  payment.changeAmount != null && (
                    <p className="text-sm">
                      Recibido: {format(payment.receivedAmount)} · Vuelto:{" "}
                      {format(payment.changeAmount)}
                    </p>
                  )}
                {payment.billPartId && (
                  <p className="text-sm">
                    Parte:{" "}
                    {parts.data?.parts.find(
                      (part) => part.id === payment.billPartId,
                    )?.name ?? "Por productos"}
                  </p>
                )}
                {!payment.billPartId &&
                  payment.status === "COMPLETED" &&
                  payment.pendingAfter != null && (
                    <>
                      <p className="text-sm">
                        Saldo tras el abono: {format(payment.pendingAfter)}
                      </p>
                      <BillDocumentButton
                        document={{ paymentId: payment.id }}
                        disabled={blocked}
                      />
                    </>
                  )}
                {privileged &&
                  payment.status === "COMPLETED" &&
                  !payments.isError &&
                  (cancelId === payment.id ? (
                    <CancelPaymentForm
                      payment={payment}
                      close={() => setCancelId(undefined)}
                    />
                  ) : (
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={cancelling}
                      onClick={() => setCancelId(payment.id)}
                    >
                      Anular pago
                    </button>
                  ))}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
