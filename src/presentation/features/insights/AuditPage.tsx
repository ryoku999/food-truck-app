import { auditActions, type AuditAction, type AuditFilters } from "@/core/entities/insights.entity";
import { useAuditDetail, useAuditLogs } from "@/infrastructure/hooks/use-insights";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { auditEnd, auditStart, limaDateTime } from "./insights-dates";

const actionLabels: Record<AuditAction, string> = {
  CREATE: "Creación", UPDATE: "Actualización", DELETE: "Eliminación", CANCEL: "Anulación",
  LOGIN: "Inicio de sesión", LOGOUT: "Cierre de sesión", PAYMENT: "Pago", PRINT: "Impresión",
  OPEN_CASH: "Apertura de caja", CLOSE_CASH: "Cierre de caja",
};
const date = z.union([z.iso.date().refine(value => /^20/.test(value), "Usa fechas entre 2000 y 2099"), z.literal("")]);
const schema = z.object({
  action: z.enum(["", ...auditActions]), userId: z.union([z.uuid("Ingresa un UUID válido"), z.literal("")]),
  entity: z.string().trim().max(100), entityId: z.string().trim().max(200), from: date, to: date,
}).refine(values => !values.from || !values.to || values.from <= values.to, { path: ["to"], message: "La fecha final debe ser igual o posterior a la inicial." });
type Fields = z.infer<typeof schema>;
const defaults: Fields = { action: "", entity: "", entityId: "", userId: "", from: "", to: "" };
const limit = 20;

function Detail({ id, close }: { id: string; close: () => void }) {
  const query = useAuditDetail(id);
  const log = query.data;
  return <section className="card border border-base-300 bg-base-100"><div className="card-body">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="card-title">Detalle del evento</h2>
      <button className="btn btn-outline" onClick={close}>Cerrar detalle</button>
    </div>
    {query.isPending && <p role="status">Cargando evento…</p>}
    {query.isError && <div className="alert alert-error" role="alert">{apiError(query.error, "No se pudo cargar el evento.")}<button className="btn" onClick={() => void query.refetch()}>Reintentar</button></div>}
    {log && <>
      <p className="font-semibold">{actionLabels[log.action]} · {limaDateTime(log.createdAt)}</p>
      {log.description && <p>{log.description}</p>}
      <dl className="grid gap-2 break-all sm:grid-cols-2">
        <div><dt className="font-semibold">Usuario</dt><dd>{log.user?.username ?? log.userId ?? "Sistema"}</dd></div>
        <div><dt className="font-semibold">Entidad</dt><dd>{log.entity}{log.entityId ? ` · ${log.entityId}` : ""}</dd></div>
        <div><dt className="font-semibold">IP</dt><dd>{log.ipAddress ?? "—"}</dd></div>
        <div><dt className="font-semibold">Agente de usuario</dt><dd>{log.userAgent ?? "—"}</dd></div>
      </dl>
      <div className="grid gap-3 lg:grid-cols-2">
        {[["Datos anteriores", log.oldData], ["Datos nuevos", log.newData]].map(([label, data]) => <div key={String(label)} className="min-w-0 rounded-box bg-base-200 p-3">
          <h3 className="font-semibold">{String(label)}</h3>
          {data == null ? <p>Sin datos registrados.</p> : <pre className="mt-2 whitespace-pre-wrap break-all text-sm">{JSON.stringify(data, null, 2)}</pre>}
        </div>)}
      </div>
    </>}
  </div></section>;
}

export default function AuditPage() {
  const [params, setParams] = useSearchParams();
  const id = z.uuid().safeParse(params.get("event")).data;
  const [filters, setFilters] = useState<AuditFilters>({ limit, offset: 0 });
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema), defaultValues: defaults });
  const query = useAuditLogs(filters);
  function apply(values: Fields) {
    setParams({});
    setFilters({
      limit, offset: 0, action: values.action || undefined, userId: values.userId || undefined,
      entity: values.entity || undefined, entityId: values.entityId || undefined,
      from: values.from ? auditStart(values.from) : undefined, to: values.to ? auditEnd(values.to) : undefined,
    });
  }
  return <div className="space-y-4">
    <div><h1 className="text-3xl font-bold">Auditoría</h1><p>Actividad del sistema · horario de Lima</p></div>
    <form className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 xl:grid-cols-3" noValidate onSubmit={handleSubmit(apply)}>
      <label className="grid gap-1">Acción<select className="select w-full" {...register("action")}>
        <option value="">Todas</option>{auditActions.map(action => <option key={action} value={action}>{actionLabels[action]}</option>)}
      </select></label>
      <label className="grid gap-1">Entidad<input className="input w-full" placeholder="Ej. Payment" maxLength={100} {...register("entity")} /></label>
      <label className="grid gap-1">ID de entidad<input className="input w-full" maxLength={200} {...register("entityId")} /></label>
      <label className="grid gap-1">ID de usuario<input className="input w-full" maxLength={36} {...register("userId")} /></label>
      <label className="grid gap-1">Desde<input className="input w-full" type="date" {...register("from")} /></label>
      <label className="grid gap-1">Hasta<input className="input w-full" type="date" {...register("to")} /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
        <button className="btn btn-primary">Aplicar filtros</button>
        <button type="button" className="btn btn-outline" onClick={() => { reset(defaults); apply(defaults); }}>Limpiar</button>
      </div>
      {Object.entries(errors).map(([key, error]) => <p className="text-error" role="alert" key={key}>{error.message}</p>)}
    </form>
    {id && <Detail id={id} close={() => setParams({})} />}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">Eventos {query.data ? `· ${query.data.total}` : ""}</h2>
      <button className="btn btn-outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Actualizar</button>
    </div>
    {query.isPending && <p role="status">Cargando eventos…</p>}
    {query.isError && <p role="alert" className="alert alert-error">{apiError(query.error, "No se pudieron cargar los eventos.")}</p>}
    {query.data?.items.length === 0 && <p>No hay eventos para estos filtros.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{query.data?.items.map(log => <li key={log.id} className="card border border-base-300 bg-base-100"><div className="card-body gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="badge badge-outline">{actionLabels[log.action]}</span><span className="text-sm">{limaDateTime(log.createdAt)}</span>
      </div>
      <h3 className="font-semibold">{log.entity}</h3>
      <p>{log.user?.username ?? (log.userId ? "Usuario no disponible" : "Sistema")}</p>
      {log.description && <p className="break-words">{log.description}</p>}
      <div className="card-actions">
        <Link className="btn btn-outline" to={`?event=${log.id}`}>Ver detalle</Link>
        {log.userId && <button type="button" className="btn btn-ghost" onClick={() => {
          setValue("userId", log.userId ?? ""); void handleSubmit(apply)();
        }}>Filtrar por usuario</button>}
      </div>
    </div></li>)}</ul>
    {(filters.offset > 0 || (query.data?.total ?? 0) > limit) && <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación de auditoría">
      <button className="btn btn-outline" disabled={!filters.offset} onClick={() => setFilters(previous => ({ ...previous, offset: Math.max(0, previous.offset - limit) }))}>Anterior</button>
      <span>Pág. {filters.offset / limit + 1}</span>
      <button className="btn btn-outline" disabled={filters.offset + limit >= (query.data?.total ?? 0) || filters.offset + limit > 100000} onClick={() => setFilters(previous => ({ ...previous, offset: previous.offset + limit }))}>Siguiente</button>
    </nav>}
  </div>;
}
