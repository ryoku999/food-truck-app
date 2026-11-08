import { paymentCodes, type CashRegister, type PaymentMethod } from "@/core/entities/cashier.entity";
import { useCashRegisters, useCashierAction, usePaymentMethods } from "@/infrastructure/hooks/use-cashier";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre").max(100),
  code: z.enum(paymentCodes),
  sortOrder: z.number().int().min(0).max(2147483647),
});
type Editor = { kind: "method"; item?: PaymentMethod } | { kind: "register"; item?: CashRegister };

function SettingsForm({ editor, close }: { editor: Editor; close: () => void }) {
  const action = useCashierAction();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: editor.item?.name ?? "", code: editor.kind === "method" ? editor.item?.code ?? "OTHER" : "OTHER", sortOrder: editor.kind === "method" ? editor.item?.sortOrder ?? 0 : 0 },
  });
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async input => {
    try {
      await action.mutateAsync(repo => editor.kind === "method" ? repo.saveMethod(input, editor.item?.id) : repo.saveRegister({ name: input.name }, editor.item?.id));
      close();
    } catch { /* API error is shown below. */ }
  })}><div className="card-body">
    <h2 className="card-title">{editor.item ? "Editar" : "Crear"} {editor.kind === "method" ? "método de pago" : "caja"}</h2>
    <label className="grid gap-1">Nombre<input className="input w-full" {...register("name")} /></label>
    {editor.kind === "method" && <>
      <label className="grid gap-1">Código<select className="select w-full" {...register("code")}>{paymentCodes.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
      <label className="grid gap-1">Orden<input className="input w-full" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} /></label>
    </>}
    {(errors.name || errors.sortOrder) && <p role="alert" className="text-error">{errors.name?.message || errors.sortOrder?.message}</p>}
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se pudo guardar.")}</p>}
    <div className="card-actions"><button className="btn btn-primary" disabled={isSubmitting}>Guardar</button><button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button></div>
  </div></form>;
}

export default function CashSettingsPage() {
  const methods = usePaymentMethods();
  const registers = useCashRegisters();
  const [editor, setEditor] = useState<Editor>();
  const action = useCashierAction();
  return <div className="space-y-4">
    <h1 className="text-3xl font-bold">Configuración de caja</h1>
    {editor && <SettingsForm key={editor.item?.id ?? editor.kind} editor={editor} close={() => setEditor(undefined)} />}
    {action.isError && <p role="alert" className="alert alert-error">{apiError(action.error, "No se pudo cambiar el estado.")}</p>}
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">Métodos de pago</h2><button className="btn btn-primary" disabled={!!editor || action.isPending} onClick={() => setEditor({ kind: "method" })}>Nuevo método</button></div>
        {methods.isPending && <p role="status">Cargando métodos…</p>}
        {methods.isError && <div className="alert alert-error" role="alert">No se pudieron cargar los métodos.<button className="btn" onClick={() => void methods.refetch()}>Reintentar</button></div>}
        {methods.data?.length === 0 && <p>Sin métodos configurados.</p>}
        {methods.data?.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-2">
          <div><p className="font-semibold">{item.name}</p><p className="text-sm">{item.code} · {item.active ? "Activo" : "Inactivo"}</p></div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline" disabled={!!editor || action.isPending} onClick={() => setEditor({ kind: "method", item })}>Editar</button>
            <button className="btn btn-sm btn-outline" disabled={!!editor || action.isPending} onClick={() => action.mutate(repo => repo.methodActive(item.id, !item.active))}>{item.active ? "Desactivar" : "Activar"}</button>
          </div>
        </div>)}
      </section>
      <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">Cajas</h2><button className="btn btn-primary" disabled={!!editor || action.isPending} onClick={() => setEditor({ kind: "register" })}>Nueva caja</button></div>
        {registers.isPending && <p role="status">Cargando cajas…</p>}
        {registers.isError && <div className="alert alert-error" role="alert">No se pudieron cargar las cajas.<button className="btn" onClick={() => void registers.refetch()}>Reintentar</button></div>}
        {registers.data?.length === 0 && <p>Sin cajas configuradas.</p>}
        {registers.data?.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-2">
          <div><p className="font-semibold">{item.name}</p><p className="text-sm">{item.active ? item.currentSession ? "Turno abierto" : "Activa" : "Inactiva"}</p></div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline" disabled={!!editor || action.isPending} onClick={() => setEditor({ kind: "register", item })}>Editar</button>
            <button className="btn btn-sm btn-outline" disabled={!!editor || action.isPending || !!item.currentSession} onClick={() => action.mutate(repo => repo.saveRegister({ active: !item.active }, item.id))}>{item.active ? "Desactivar" : "Activar"}</button>
          </div>
        </div>)}
      </section>
    </div>
  </div>;
}
