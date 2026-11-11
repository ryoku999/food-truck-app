import { useConfirm } from "@/presentation/components/use-confirm";
import type { ManagedUser, UserFilters } from "@/core/entities/management.entity";
import { useUser, useUserActions, useUsers } from "@/infrastructure/hooks/use-management";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const roles = ["ADMIN", "MANAGER", "WAITER", "KITCHEN", "BAR", "CASHIER"] as const;
const statuses = ["ACTIVE", "INACTIVE"] as const;
const roleLabels = { ADMIN: "Administrador", MANAGER: "Gerente", WAITER: "Mozo", KITCHEN: "Cocina", BAR: "Barra", CASHIER: "Caja" };
const passwordRule = z.string().min(8, "Usa al menos ocho caracteres").max(72);
const passwordSchema = z.object({ password: passwordRule });
const schema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._-]+$/, "Usa letras, números, punto, guion o guion bajo"),
  dni: z.string().trim().regex(/^\d{8}$/, "Ingresa ocho dígitos"),
  firstName: z.string().trim().min(1, "Ingresa el nombre").max(100),
  lastName: z.string().trim().max(100),
  userRole: z.enum(roles),
});
const createSchema = schema.extend(passwordSchema.shape);
type UserFormValues = z.infer<typeof schema> & { password?: string };

function UserForm({ user, close }: { user?: ManagedUser; close: () => void }) {
  const { create, update } = useUserActions();
  const mutation = user ? update : create;
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(user ? schema : createSchema),
    defaultValues: { username: user?.username ?? "", dni: user?.dni ?? "", firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "", userRole: user?.userRole ?? "WAITER", password: "" },
  });
  const fields = [["username", "Usuario"], ["dni", "DNI"], ["firstName", "Nombres"], ["lastName", "Apellidos"]] as const;
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(({ password, ...fields }) => {
    const input = { ...fields, lastName: fields.lastName || null };
    if (user) update.mutate({ id: user.id, input }, { onSuccess: close });
    else if (password) create.mutate({ ...input, password }, { onSuccess: close });
  })}>
    <div className="card-body">
      <h2 className="card-title">{user ? `Editar @${user.username}` : "Nuevo usuario"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => <label key={key} className="grid gap-1">{label}
          <input className="input w-full" inputMode={key === "dni" ? "numeric" : "text"} aria-invalid={!!errors[key]} {...register(key)} />
          {errors[key] && <span className="text-sm text-error">{errors[key]?.message}</span>}
        </label>)}
        <label className="grid gap-1">Rol<select className="select w-full" {...register("userRole")}>
          {roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select></label>
        {!user && <label className="grid gap-1">Contraseña inicial
          <input type="password" autoComplete="new-password" className="input w-full" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <span className="text-sm text-error">{errors.password.message}</span>}
        </label>}
      </div>
      {mutation.isError && <p className="alert alert-error" role="alert">{apiError(mutation.error, "No se pudo guardar el usuario.")}</p>}
      <div className="card-actions">
        <button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : "Guardar usuario"}</button>
        <button type="button" className="btn btn-ghost" disabled={mutation.isPending} onClick={close}>Cancelar</button>
      </div>
    </div>
  </form>;
}

function PasswordForm({ user, close }: { user: ManagedUser; close: () => void }) {
  const { password } = useUserActions();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: "" } });
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(values => password.mutate({ id: user.id, password: values.password }, { onSuccess: close }))}>
    <div className="card-body">
      <h2 className="card-title">Cambiar contraseña de @{user.username}</h2>
      <label className="grid gap-1">Nueva contraseña<input type="password" autoComplete="new-password" className="input w-full max-w-sm" {...register("password")} /></label>
      {errors.password && <p className="text-error">{errors.password.message}</p>}
      {password.isError && <p className="alert alert-error" role="alert">{apiError(password.error, "No se pudo cambiar la contraseña.")}</p>}
      <div className="card-actions">
        <button className="btn btn-primary" disabled={password.isPending}>Cambiar contraseña</button>
        <button type="button" className="btn btn-ghost" disabled={password.isPending} onClick={close}>Cancelar</button>
      </div>
    </div>
  </form>;
}

export default function UsersPage() {
  const confirmAction = useConfirm();
  const admin = useAuthStore(state => state.user?.userRole === "ADMIN");
  const currentId = useAuthStore(state => state.user?.id);
  const [filters, setFilters] = useState<UserFilters>({ page: 1, pageSize: 12 });
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{ mode: "detail" | "edit" | "password"; id: string } | { mode: "create" }>();
  const [notice, setNotice] = useState("");
  const list = useUsers(filters);
  const detail = useUser(selection && "id" in selection ? selection.id : undefined);
  const { status } = useUserActions();
  const close = () => setSelection(undefined);
  const done = (message: string) => { close(); setNotice(message); };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Usuarios</h1>
      {admin && <button className="btn btn-primary" onClick={() => { setNotice(""); setSelection({ mode: "create" }); }}>Nuevo usuario</button>}
    </div>
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    {selection?.mode === "create" && admin && <UserForm close={() => done("Usuario creado.")} />}
    {selection && "id" in selection && (detail.isPending ? <p role="status">Cargando usuario…</p> :
      detail.isError ? <div className="alert alert-error" role="alert">{apiError(detail.error, "No se pudo cargar el usuario.")}<button className="btn" onClick={close}>Cerrar</button></div> :
      selection.mode === "edit" && admin ? <UserForm key={detail.data.id} user={detail.data} close={close} /> :
      selection.mode === "password" && admin ? <PasswordForm key={detail.data.id} user={detail.data} close={close} /> :
      <section className="card border border-base-300 bg-base-100"><div className="card-body">
        <h2 className="card-title">@{detail.data.username}</h2>
        <p>{detail.data.firstName} {detail.data.lastName} · DNI {detail.data.dni}</p>
        <p>{roleLabels[detail.data.userRole]} · {detail.data.status === "ACTIVE" ? "Activo" : "Inactivo"}</p>
        <button className="btn btn-outline self-start" onClick={close}>Cerrar detalle</button>
      </div></section>)}
    <form className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4" onSubmit={event => {
      event.preventDefault();
      setFilters(previous => ({ ...previous, page: 1, search: search.trim() || undefined }));
    }}>
      <label className="grid gap-1">Buscar<input className="input w-full" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Usuario, nombre o DNI" /></label>
      <label className="grid gap-1">Rol<select className="select w-full" value={filters.userRole ?? ""} onChange={event => {
        const result = z.enum(roles).safeParse(event.target.value);
        setFilters(previous => ({ ...previous, page: 1, userRole: result.data }));
      }}><option value="">Todos</option>{roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
      <label className="grid gap-1">Estado<select className="select w-full" value={filters.status ?? ""} onChange={event => {
        const result = z.enum(statuses).safeParse(event.target.value);
        setFilters(previous => ({ ...previous, page: 1, status: result.data }));
      }}><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></label>
      <button className="btn btn-outline">Buscar</button>
    </form>
    {status.isError && <p className="alert alert-error" role="alert">{apiError(status.error, "No se pudo cambiar el estado.")}</p>}
    {list.isPending ? <p role="status">Cargando usuarios…</p> : list.isError ?
      <div className="alert alert-error" role="alert">{apiError(list.error, "No se pudo cargar el listado.")}<button className="btn" onClick={() => void list.refetch()}>Reintentar</button></div> : <>
      {list.data.items.length === 0 && <p>No hay usuarios en esta página.</p>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.data.items.map(user => <li key={user.id} className="card border border-base-300 bg-base-100"><div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="card-title break-all">@{user.username}</h2>
            <span className={user.status === "ACTIVE" ? "badge badge-success" : "badge badge-ghost"}>{user.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
          </div>
          <p>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Sin nombre"} · {roleLabels[user.userRole]}</p>
          <div className="card-actions">
            <button className="btn btn-sm btn-outline" onClick={() => setSelection({ mode: "detail", id: user.id })}>Ver</button>
            {admin && <>
              <button className="btn btn-sm btn-outline" onClick={() => setSelection({ mode: "edit", id: user.id })}>Editar</button>
              <button className="btn btn-sm btn-outline" onClick={() => setSelection({ mode: "password", id: user.id })}>Contraseña</button>
              {user.id !== currentId && <button className="btn btn-sm btn-outline" disabled={status.isPending} onClick={async () => {
                const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                if ((await confirmAction(`¿${next === "ACTIVE" ? "Activar" : "Desactivar"} a @${user.username}?`))) {
                  setNotice("");
                  status.mutate({ id: user.id, status: next }, { onSuccess: () => setNotice("Estado actualizado.") });
                }
              }}>{user.status === "ACTIVE" ? "Desactivar" : "Activar"}</button>}
            </>}
          </div>
        </div></li>)}
      </ul>
      <nav className="flex flex-wrap items-center gap-3" aria-label="Paginación de usuarios">
        <button className="btn btn-outline" disabled={filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Anterior</button>
        <span>Página {filters.page} de {Math.max(1, list.data.meta.pageCount)} · {list.data.meta.total} usuarios</span>
        <button className="btn btn-outline" disabled={filters.page >= list.data.meta.pageCount} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Siguiente</button>
      </nav>
    </>}
  </div>;
}
