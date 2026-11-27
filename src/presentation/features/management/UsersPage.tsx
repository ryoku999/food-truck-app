import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Alert } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { useConfirm } from "@/presentation/components/use-confirm";
import type {
  ManagedUser,
  UserFilters,
} from "@/core/entities/management.entity";
import {
  useUser,
  useUserActions,
  useUsers,
} from "@/infrastructure/hooks/use-management";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const roles = [
  "ADMIN",
  "MANAGER",
  "WAITER",
  "CASHIER",
] as const;
const statuses = ["ACTIVE", "INACTIVE"] as const;
const roleLabels = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAITER: "Mozo",
  CASHIER: "Caja",
};
const passwordRule = z.string().min(8, "Usa al menos ocho caracteres").max(72);
const passwordSchema = z.object({ password: passwordRule });
const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9._-]+$/, "Usa letras, números, punto, guion o guion bajo"),
  dni: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Ingresa ocho dígitos"),
  firstName: z.string().trim().min(1, "Ingresa el nombre").max(100),
  lastName: z.string().trim().max(100),
  userRole: z.enum(roles),
});
const createSchema = schema.extend(passwordSchema.shape);
type UserFormValues = z.infer<typeof schema> & { password?: string };

function UserForm({
  user,
  close,
  onSuccess,
}: {
  user?: ManagedUser;
  close: () => void;
  onSuccess: () => void;
}) {
  const { create, update } = useUserActions();
  const mutation = user ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(user ? schema : createSchema),
    defaultValues: {
      username: user?.username ?? "",
      dni: user?.dni ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      userRole: user?.userRole ?? "WAITER",
      password: "",
    },
  });
  const fields = [
    ["username", "Usuario"],
    ["dni", "DNI"],
    ["firstName", "Nombres"],
    ["lastName", "Apellidos"],
  ] as const;
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit(({ password, ...fields }) => {
        const input = { ...fields, lastName: fields.lastName || null };
        if (user) update.mutate({ id: user.id, input }, { onSuccess });
        else if (password)
          create.mutate({ ...input, password }, { onSuccess });
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {user ? `Editar ${user.username}` : "Nuevo usuario"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="grid gap-1">
              {label}
              <Input
                className="w-full"
                inputMode={key === "dni" ? "numeric" : "text"}
                aria-invalid={!!errors[key]}
                {...register(key)}
              />
              {errors[key] && (
                <span className="text-sm text-destructive">
                  {errors[key]?.message}
                </span>
              )}
            </label>
          ))}
          <label className="grid gap-1">
            Rol
            <NativeSelect className="w-full" {...register("userRole")}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </NativeSelect>
          </label>
          {!user && (
            <label className="grid gap-1">
              Contraseña inicial
              <Input
                type="password"
                autoComplete="new-password"
                className="w-full"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <span className="text-sm text-destructive">
                  {errors.password.message}
                </span>
              )}
            </label>
          )}
        </div>
        {mutation.isError && (
          <Alert variant="destructive" role="alert">
            {apiError(mutation.error, "No se pudo guardar el usuario.")}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar usuario"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={close}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordForm({
  user,
  close,
}: {
  user: ManagedUser;
  close: () => void;
}) {
  const { password } = useUserActions();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit((values) =>
        password.mutate(
          { id: user.id, password: values.password },
          { onSuccess: close },
        ),
      )}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">Cambiar contraseña de {user.username}</h2>
        <label className="grid gap-1">
          Nueva contraseña
          <Input
            type="password"
            autoComplete="new-password"
            className="w-full max-w-sm"
            {...register("password")}
          />
        </label>
        {errors.password && (
          <p className="text-destructive">{errors.password.message}</p>
        )}
        {password.isError && (
          <Alert variant="destructive" role="alert">
            {apiError(password.error, "No se pudo cambiar la contraseña.")}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={password.isPending}>
            Cambiar contraseña
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={password.isPending}
            onClick={close}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const confirmAction = useConfirm();
  const admin = useAuthStore((state) => state.user?.userRole === "ADMIN");
  const currentId = useAuthStore((state) => state.user?.id);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 12,
  });
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<
    { mode: "detail" | "edit" | "password"; id: string } | { mode: "create" }
  >();
  const [notice, setNotice] = useState("");
  const list = useUsers(filters);
  const detail = useUser(
    selection && "id" in selection ? selection.id : undefined,
  );
  const { status } = useUserActions();
  const close = () => setSelection(undefined);
  const done = (message: string) => {
    close();
    setNotice(message);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">Usuarios</h1>
        {admin && (
          <Button
            type="submit"
            onClick={() => {
              setNotice("");
              setSelection({ mode: "create" });
            }}
          >
            Nuevo usuario
          </Button>
        )}
      </div>
      {notice && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
      {selection?.mode === "create" && admin && (
        <UserForm close={close} onSuccess={() => done("Usuario creado.")} />
      )}
      {selection &&
        "id" in selection &&
        (detail.isPending ? (
          <p role="status">Cargando usuario…</p>
        ) : detail.isError ? (
          <Alert variant="destructive" role="alert">
            {apiError(detail.error, "No se pudo cargar el usuario.")}
            <Button type="submit" variant="outline" onClick={close}>
              Cerrar
            </Button>
          </Alert>
        ) : selection.mode === "edit" && admin ? (
          <UserForm
            key={detail.data.id}
            user={detail.data}
            close={close}
            onSuccess={close}
          />
        ) : selection.mode === "password" && admin ? (
          <PasswordForm key={detail.data.id} user={detail.data} close={close} />
        ) : (
          <Card as="section">
            <CardContent>
              <h2 className="text-lg leading-snug font-semibold">{detail.data.username}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm opacity-70">Nombre completo</dt>
                  <dd className="font-medium">
                    {[detail.data.firstName, detail.data.lastName]
                      .filter(Boolean)
                      .join(" ") || "Sin nombre"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm opacity-70">DNI</dt>
                  <dd className="font-medium">{detail.data.dni}</dd>
                </div>
                <div>
                  <dt className="text-sm opacity-70">Rol</dt>
                  <dd className="font-medium">
                    {roleLabels[detail.data.userRole]}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm opacity-70">Estado</dt>
                  <dd className="font-medium">
                    {detail.data.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </dd>
                </div>
              </dl>
              <Button type="submit" variant="outline" className="self-start" onClick={close}>
                Cerrar detalle
              </Button>
            </CardContent>
          </Card>
        ))}
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((previous) => ({
            ...previous,
            page: 1,
            search: search.trim() || undefined,
          }));
        }}
      >
        <label className="grid gap-1">
          Buscar
          <Input
            className="w-full"
            value={search}
            maxLength={100}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Usuario, nombre o DNI"
          />
        </label>
        <label className="grid gap-1">
          Rol
          <NativeSelect
            className="w-full"
            value={filters.userRole ?? ""}
            onChange={(event) => {
              const result = z.enum(roles).safeParse(event.target.value);
              setFilters((previous) => ({
                ...previous,
                page: 1,
                userRole: result.data,
              }));
            }}
          >
            <option value="">Todos</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1">
          Estado
          <NativeSelect
            className="w-full"
            value={filters.status ?? ""}
            onChange={(event) => {
              const result = z.enum(statuses).safeParse(event.target.value);
              setFilters((previous) => ({
                ...previous,
                page: 1,
                status: result.data,
              }));
            }}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </NativeSelect>
        </label>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
      {status.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(status.error, "No se pudo cambiar el estado.")}
        </Alert>
      )}
      {list.isPending ? (
        <p role="status">Cargando usuarios…</p>
      ) : list.isError ? (
        <Alert variant="destructive" role="alert">
          {apiError(list.error, "No se pudo cargar el listado.")}
          <Button type="submit" variant="outline" onClick={() => void list.refetch()}>
            Reintentar
          </Button>
        </Alert>
      ) : (
        <>
          {list.data.items.length === 0 && (
            <p>No hay usuarios en esta página.</p>
          )}
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.data.items.map((user) => (
              <Card
                key={user.id}
                as="li"
              >
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg leading-snug font-semibold break-all">{user.username}</h2>
                    <Badge
                      variant={user.status === "ACTIVE"
                          ? "success"
                          : "ghost"}
                    >
                      {user.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="opacity-70">Nombre</dt>
                      <dd className="font-medium">
                        {[user.firstName, user.lastName]
                          .filter(Boolean)
                          .join(" ") || "Sin nombre"}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-70">Rol</dt>
                      <dd className="font-medium">
                        {roleLabels[user.userRole]}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-70">DNI</dt>
                      <dd className="font-medium">{user.dni}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="submit" variant="outline" size="sm"
                      onClick={() =>
                        setSelection({ mode: "detail", id: user.id })
                      }
                    >
                      Ver
                    </Button>
                    {admin && (
                      <>
                        <Button
                          type="submit" variant="outline" size="sm"
                          onClick={() =>
                            setSelection({ mode: "edit", id: user.id })
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          type="submit" variant="outline" size="sm"
                          onClick={() =>
                            setSelection({ mode: "password", id: user.id })
                          }
                        >
                          Contraseña
                        </Button>
                        {user.id !== currentId && (
                          <Button
                            type="submit" variant="outline" size="sm"
                            disabled={status.isPending}
                            onClick={async () => {
                              const next =
                                user.status === "ACTIVE"
                                  ? "INACTIVE"
                                  : "ACTIVE";
                              if (
                                await confirmAction(
                                  `¿${next === "ACTIVE" ? "Activar" : "Desactivar"} a ${user.username}?`,
                                )
                              ) {
                                setNotice("");
                                status.mutate(
                                  { id: user.id, status: next },
                                  {
                                    onSuccess: () =>
                                      setNotice("Estado actualizado."),
                                  },
                                );
                              }
                            }}
                          >
                            {user.status === "ACTIVE"
                              ? "Desactivar"
                              : "Activar"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ul>
          <nav
            className="flex flex-wrap items-center gap-3"
            aria-label="Paginación de usuarios"
          >
            <Button
              type="submit" variant="outline"
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
            >
              Anterior
            </Button>
            <span>
              Página {filters.page} de {Math.max(1, list.data.meta.pageCount)} ·{" "}
              {list.data.meta.total} usuarios
            </span>
            <Button
              type="submit" variant="outline"
              disabled={filters.page >= list.data.meta.pageCount}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            >
              Siguiente
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
