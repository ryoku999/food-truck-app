import type { Order, OrderDetails } from "@/core/entities/order.entity";
import { orderTypes } from "@/core/entities/order.entity";
import { useTableMap } from "@/infrastructure/hooks/use-local";
import { useOrderAction } from "@/infrastructure/hooks/use-orders";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { typeLabels } from "./order-labels";

const details = z.object({
  customerName: z.string().trim().max(150),
  customerPhone: z.string().trim().max(30),
  notes: z.string().trim().max(1000),
});
const schema = details.extend({ type: z.enum(orderTypes), tableIds: z.array(z.string()).max(20, "Selecciona hasta 20 mesas") });
type Fields = z.infer<typeof schema>;

export function OrderForm({ order, initialTable, close }: { order?: Order; initialTable?: string; close?: () => void }) {
  const action = useOrderAction();
  const navigate = useNavigate();
  const map = useTableMap(undefined, false);
  const { register, control, setValue, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: order?.type ?? (initialTable ? "DINE_IN" : "TAKEAWAY"),
      tableIds: order?.tables.map(table => table.id) ?? (initialTable ? [initialTable] : []),
      customerName: order?.customerName ?? "", customerPhone: order?.customerPhone ?? "", notes: order?.notes ?? "",
    },
  });
  const type = useWatch({ control, name: "type" });
  const selected = useWatch({ control, name: "tableIds" });
  const tableAreas = map.data?.areas.map(area => ({
    id: area.id,
    name: area.name,
    tables: area.tables.filter(table => table.active &&
      (table.openOrder ? table.openOrder.id === order?.id : table.status === "AVAILABLE")),
  })).filter(area => area.tables.length > 0) ?? [];
  const candidates = tableAreas.flatMap(area => area.tables);
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async values => {
    const tableIds = type === "DINE_IN" ? values.tableIds.filter(id => candidates.some(table => table.id === id)) : [];
    if (!order && type === "DINE_IN" && (!tableIds.length || tableIds.length !== values.tableIds.length)) {
      setError("tableIds", { message: "Selecciona mesas disponibles." }); return;
    }
    try {
      if (order) {
        const input: OrderDetails = { customerName: values.customerName || null, customerPhone: values.customerPhone || null, notes: values.notes || null };
        await action.mutateAsync(repo => repo.update(order.id, input)); close?.();
      } else {
        const saved = await action.mutateAsync(repo => repo.create({
          type, tableIds, customerName: values.customerName || undefined, customerPhone: values.customerPhone || undefined, notes: values.notes || undefined,
        }));
        navigate(`/waiter/orders/${saved.id}`, { replace: true });
      }
    } catch (error) { setError("root", { message: apiError(error, "No se pudo guardar. Revisa Mis pedidos antes de volver a crear.") }); }
  })}>
    <div className="card-body">
      <h2 className="card-title">{order ? "Datos del pedido" : "Nuevo pedido"}</h2>
      {!order && <label className="grid gap-1">Tipo<select className="select w-full" {...register("type")}>
        {orderTypes.map(key => <option key={key} value={key}>{typeLabels[key]}</option>)}
      </select></label>}
      {!order && type === "DINE_IN" && <fieldset className="space-y-1"><legend className="font-semibold">Mesas</legend>
        {map.isPending && <p role="status">Cargando mesas…</p>}
        {map.isError && <p role="alert" className="text-error">No se pudieron cargar las mesas.</p>}
        {map.isSuccess && candidates.length === 0 && <p>No hay mesas disponibles.</p>}
        <div className="space-y-4">
          {tableAreas.map(area => <fieldset key={area.id} className="rounded-box border border-base-300 p-3">
            <legend className="px-2 font-semibold">{area.name}</legend>
            <div className="grid grid-cols-3 gap-2">
              {area.tables.map(table => <label key={table.id} className={`flex min-h-14 min-w-0 cursor-pointer items-center gap-2 rounded-box border p-2 ${selected.includes(table.id) ? "border-primary bg-primary/10" : "border-base-300 bg-base-100"}`}>
                <input type="checkbox" className="checkbox checkbox-sm shrink-0" checked={selected.includes(table.id)} onChange={event => {
                  setValue("tableIds", event.target.checked ? [...selected, table.id] : selected.filter(id => id !== table.id), { shouldValidate: true });
                }} />
                <span className="min-w-0 break-words text-sm">{table.name || `Mesa ${table.number}`}</span>
              </label>)}
            </div>
          </fieldset>)}
        </div>
        {errors.tableIds?.message && <p role="alert" className="text-error">{errors.tableIds.message}</p>}
      </fieldset>}
      <label className="grid gap-1">Cliente (opcional)<input className="input w-full" maxLength={150} {...register("customerName")} /></label>
      <label className="grid gap-1">Teléfono (opcional)<input className="input w-full" type="tel" maxLength={30} {...register("customerPhone")} /></label>
      <label className="grid gap-1">Notas (opcional)<textarea className="textarea w-full" maxLength={1000} {...register("notes")} /></label>
      {errors.root?.message && <p role="alert" className="alert alert-error">{errors.root.message}</p>}
      <button className="btn btn-primary min-h-11" disabled={isSubmitting || (!order && type === "DINE_IN" && !map.isSuccess)}>{isSubmitting ? "Guardando…" : order ? "Guardar datos" : "Crear borrador"}</button>
      {close && <button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button>}
    </div>
  </form>;
}

export function OrderTablesForm({ order, close }: { order: Order; close: () => void }) {
  const map = useTableMap(undefined, false);
  const action = useOrderAction();
  const { control, setValue, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ tableIds: z.array(z.string()).min(1, "Selecciona al menos una mesa").max(20, "Selecciona hasta 20 mesas") })),
    defaultValues: { tableIds: order.tables.map(table => table.id) },
  });
  const selected = useWatch({ control, name: "tableIds" });
  return <form className="card border border-base-300 bg-base-100" onSubmit={handleSubmit(async ({ tableIds }) => {
    try { await action.mutateAsync(repo => repo.setTables(order.id, tableIds)); close(); }
    catch (error) { setError("root", { message: apiError(error, "No se pudieron actualizar las mesas.") }); }
  })}><div className="card-body">
    <h2 className="card-title">Mesas del pedido</h2>
    {map.isPending && <p role="status">Cargando mesas…</p>}
    {map.isError && <p role="alert" className="text-error">No se pudieron cargar las mesas.</p>}
    <div className="space-y-4">
      {map.data?.areas.map(area => {
        const tables = area.tables.filter(table => table.openOrder
          ? table.openOrder.id === order.id
          : table.active && table.status === "AVAILABLE");
        if (!tables.length) return null;
        return <fieldset key={area.id} className="rounded-box border border-base-300 p-3">
          <legend className="px-2 font-semibold">{area.name}</legend>
          <div className="grid grid-cols-3 gap-2">
            {tables.map(table => <label key={table.id} className={`flex min-h-14 min-w-0 cursor-pointer items-center gap-2 rounded-box border p-2 ${selected.includes(table.id) ? "border-primary bg-primary/10" : "border-base-300 bg-base-100"}`}>
              <input type="checkbox" className="checkbox checkbox-sm shrink-0" checked={selected.includes(table.id)} onChange={event => {
                setValue("tableIds", event.target.checked ? [...selected, table.id] : selected.filter(id => id !== table.id), { shouldValidate: true });
              }} />
              <span className="min-w-0 break-words text-sm">{table.name || `Mesa ${table.number}`}</span>
            </label>)}
          </div>
        </fieldset>;
      })}
    </div>
    {(errors.tableIds?.message || errors.root?.message) && <p role="alert" className="alert alert-error">{errors.tableIds?.message || errors.root?.message}</p>}
    <button className="btn btn-primary" disabled={isSubmitting || !map.isSuccess}>Guardar mesas</button>
    <button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button>
  </div></form>;
}
