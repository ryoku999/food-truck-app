import type { CashSession } from "@/core/entities/cashier.entity";
import { manualMovements } from "@/core/entities/cashier.entity";
import { useCashRegisters, useCashSession, useCashierAction } from "@/infrastructure/hooks/use-cashier";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { moneyFormatter } from "../waiter/order-labels";
import { amountNumber, amountRule, movementLabels } from "./cashier-fields";

const sessionSchema = z.object({ amount: amountRule.refine(value => amountNumber(value) >= 0, "El monto no puede ser negativo"), notes: z.string().trim().max(500) });
const movementSchema = z.object({
  type: z.enum(manualMovements), amount: amountRule, description: z.string().trim().min(1, "Indica el motivo").max(500),
}).refine(values => values.type === "ADJUSTMENT" ? amountNumber(values.amount) !== 0 : amountNumber(values.amount) > 0, { path: ["amount"], message: "Ingresa un monto positivo o un ajuste distinto de cero" });

function Collections({ session, format }: { session: CashSession; format: (value: string) => string }) {
  const { collections } = session;
  return <section className="card border border-base-300 bg-base-100"><div className="card-body">
    <h2 className="card-title">Cobros del turno</h2>
    <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt>Total cobrado</dt><dd className="text-xl font-bold">{format(collections.total)}</dd></div>
      <div><dt>En efectivo</dt><dd className="font-semibold">{format(collections.cash)}</dd></div>
      <div><dt>Por otros medios</dt><dd className="font-semibold">{format(collections.nonCash)}</dd></div>
    </dl>
    <ul className="divide-y divide-base-300">
      {collections.methods.map(method => <li key={method.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span>{method.name} · {method.count} {method.count === 1 ? "pago" : "pagos"}</span>
        <span className="font-semibold">{format(method.amount)}</span>
        {(Number(method.cancelled) !== 0 || Number(method.refunded) !== 0) && <span className="w-full text-sm">Anulado: {format(method.cancelled)} · Reembolsado: {format(method.refunded)}</span>}
      </li>)}
    </ul>
    {!collections.methods.length && <p>Este turno aún no tiene cobros registrados.</p>}
    <p className="text-sm">Anulaciones: {format(collections.cancelled)} · Reembolsos: {format(collections.refunded)}</p>
  </div></section>;
}

function SessionForm({ registerId, session, complete, cancel }: { registerId: string; session?: CashSession; complete: (session: CashSession) => void; cancel?: () => void }) {
  const action = useCashierAction<CashSession>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(sessionSchema), defaultValues: { amount: "", notes: "" } });
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async ({ amount, notes }) => {
    if (session && !window.confirm("¿Confirmar el cierre con el efectivo contado?")) return;
    try {
      const result = await action.mutateAsync(repo => session ? repo.close(session.id, amountNumber(amount), notes || undefined) : repo.open(registerId, amountNumber(amount), notes || undefined));
      complete(result);
    } catch { /* API error is shown below. */ }
  })}><div className="card-body">
    <h2 className="card-title">{session ? "Cerrar turno" : "Abrir turno"}</h2>
    <label className="grid gap-1">{session ? "Efectivo contado" : "Fondo inicial"}<input inputMode="decimal" className="input w-full" {...register("amount")} /></label>
    {errors.amount && <p className="text-error">{errors.amount.message}</p>}
    <label className="grid gap-1">Notas (opcional)<textarea className="textarea w-full" maxLength={500} {...register("notes")} /></label>
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se confirmó la operación. Revisa el estado de la caja.")}</p>}
    <div className="card-actions">
      <button className="btn btn-primary min-h-11" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : session ? "Cerrar caja" : "Abrir caja"}</button>
      {cancel && <button type="button" className="btn btn-ghost" disabled={isSubmitting} onClick={cancel}>Volver</button>}
    </div>
  </div></form>;
}

function MovementForm({ id, close }: { id: string; close: () => void }) {
  const action = useCashierAction();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof movementSchema>>({ resolver: zodResolver(movementSchema), defaultValues: { type: "INCOME", amount: "", description: "" } });
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async values => {
    try {
      await action.mutateAsync(repo => repo.movement(id, { ...values, amount: amountNumber(values.amount) }));
      close();
    } catch { /* API error is shown below. */ }
  })}><div className="card-body">
    <h2 className="card-title">Registrar movimiento</h2>
    <label className="grid gap-1">Tipo<select className="select w-full" {...register("type")}>{manualMovements.map(type => <option key={type} value={type}>{movementLabels[type]}</option>)}</select></label>
    <label className="grid gap-1">Monto<input className="input w-full" inputMode="decimal" {...register("amount")} /></label>
    <label className="grid gap-1">Motivo<textarea className="textarea w-full" maxLength={500} {...register("description")} /></label>
    {(errors.amount || errors.description) && <p role="alert" className="text-error">{errors.amount?.message || errors.description?.message}</p>}
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se confirmó el movimiento. Revisa el historial antes de repetirlo.")}</p>}
    <div className="card-actions">
      <button className="btn btn-primary" disabled={isSubmitting}>Registrar</button>
      <button type="button" className="btn btn-ghost" disabled={isSubmitting} onClick={close}>Volver</button>
    </div>
  </div></form>;
}

export default function CashSessionPage() {
  const registers = useCashRegisters();
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"movement" | "close">();
  const [receipt, setReceipt] = useState<CashSession>();
  const business = useBusiness();
  const money = moneyFormatter(business.data?.currencyCode);
  const format = (amount: string | null) => amount == null ? "—" : money.format(Number(amount));
  const active = registers.data?.filter(register => register.active) ?? [];
  const register = active.find(item => item.id === selected) ?? active[0];
  const session = useCashSession(register?.currentSession?.id);
  const current = session.data?.status === "OPEN" ? session.data : undefined;
  return <div className="mx-auto max-w-4xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-bold">Turno de caja</h1><Link className="btn btn-outline" to="../accounts" relative="path">Ver cuentas</Link></div>
    {registers.isPending && <p role="status">Cargando cajas…</p>}
    {registers.isError && <div className="alert alert-error" role="alert">{apiError(registers.error, "No se pudieron cargar las cajas.")}<button className="btn" onClick={() => void registers.refetch()}>Reintentar</button></div>}
    {registers.isSuccess && !register && <p>No hay cajas activas. Solicita a Gestión que configure una.</p>}
    {register && <label className="grid gap-1">Caja<select className="select w-full sm:max-w-xs" value={register.id} onChange={event => { setSelected(event.target.value); setMode(undefined); setReceipt(undefined); }}>
      {active.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currentSession ? "Abierta" : "Sin turno"}</option>)}
    </select></label>}
    {receipt?.cashRegisterId === register?.id && receipt?.status === "CLOSED" && <><section className="card border border-base-300 bg-base-100"><div className="card-body">
      <h2 className="card-title">Cierre confirmado</h2>
      <p>Esperado: {format(receipt.expectedAmount)} · Contado: {format(receipt.actualAmount)} · Diferencia: {format(receipt.difference)}</p>
    </div></section><Collections session={receipt} format={format} /></>}
    {register && !register.currentSession && !registers.isError && <SessionForm key={register.id} registerId={register.id} complete={setReceipt} />}
    {register?.currentSession && session.isPending && <p role="status">Cargando turno…</p>}
    {session.isError && <div className="alert alert-error" role="alert">{apiError(session.error, "No se pudo cargar el turno.")}<button className="btn" onClick={() => void session.refetch()}>Reintentar</button></div>}
    {current && <>
      <Collections session={current} format={format} />
      <section className="card border border-base-300 bg-base-100"><div className="card-body">
        <h2 className="card-title">Efectivo en caja <span className="badge badge-success">Turno abierto</span></h2>
        <dl className="grid grid-cols-2 gap-3">
          <div><dt>Fondo inicial</dt><dd className="font-bold">{format(current.openingAmount)}</dd></div>
          <div><dt>Efectivo esperado</dt><dd className="font-bold">{format(current.liveExpectedAmount)}</dd></div>
          {(["SALE", "INCOME", "EXPENSE", "WITHDRAWAL", "ADJUSTMENT"] as const).map(type => <div key={type}><dt>{movementLabels[type]}</dt><dd>{format(current.summary[type])}</dd></div>)}
        </dl>
        <div className="card-actions">
          <button className="btn btn-primary" disabled={!!mode || session.isError} onClick={() => setMode("movement")}>Nuevo movimiento</button>
          <button className="btn btn-outline" disabled={!!mode || session.isError} onClick={() => setMode("close")}>Preparar cierre</button>
        </div>
      </div></section>
      {mode === "movement" && <MovementForm key={current.id} id={current.id} close={() => setMode(undefined)} />}
      {mode === "close" && <SessionForm key={current.id} registerId={current.cashRegisterId} session={current} complete={result => { setReceipt(result); setMode(undefined); }} cancel={() => setMode(undefined)} />}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Movimientos</h2>
        {current.movements.length === 0 && <p>Todavía no hay movimientos.</p>}
        <ul className="space-y-2">{[...current.movements].reverse().map(item => <li className="flex flex-wrap justify-between gap-2 rounded-box border border-base-300 bg-base-100 p-3" key={item.id}>
          <div><p className="font-semibold">{movementLabels[item.type]}</p>{item.description && <p>{item.description}</p>}</div><span>{format(item.amount)}</span>
        </li>)}</ul>
      </section>
    </>}
  </div>;
}
