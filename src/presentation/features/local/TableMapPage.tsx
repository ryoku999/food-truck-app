import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Label } from "@/presentation/components/ui/label";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import { Alert } from "@/presentation/components/ui/alert";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Badge } from "@/presentation/components/ui/badge";
import type { TableStatus } from "@/core/entities/local.entity";
import { useBusiness } from "@/infrastructure/hooks/use-management";
import {
  useDiningAreas,
  useLocalActions,
  useTableMap,
} from "@/infrastructure/hooks/use-local";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { apiError } from "@/shared/utils/api-error";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/presentation/components/ui/skeleton";

const statuses = {
  AVAILABLE: { label: "Disponible", badge: "success" },
  OCCUPIED: { label: "Ocupada", badge: "warning" },
  DISABLED: { label: "Deshabilitada", badge: "ghost" },
} as const satisfies Record<TableStatus, { label: string; badge: string }>;

export default function TableMapPage() {
  const role = useAuthStore((state) => state.user?.userRole);
  const waiter = role === "WAITER";
  const canManage = role === "ADMIN" || role === "MANAGER";
  const canChangeStatus = canManage || role === "CASHIER";
  const [area, setArea] = useState("");
  const [inactive, setInactive] = useState(false);
  const areas = useDiningAreas();
  const map = useTableMap(area || undefined, inactive && canManage);
  const business = useBusiness();
  const { status } = useLocalActions();
  const grid = waiter ? "grid gap-3" : "grid gap-3 @lg:grid-cols-2 @4xl:grid-cols-3";
  const currency = business.data?.currencyCode ?? "PEN";
  const money = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "PEN",
  });
  return (
    <div className="space-y-5">
      <h1 className="text-[1.75rem] font-semibold tracking-tight @lg:text-4xl">Mapa de mesas</h1>
      <div className="clay-panel flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="grid min-w-0 flex-1 gap-1 text-sm @lg:flex-none">
          Área
          <NativeSelect
            className="w-full"
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            <option value="">Todas las áreas</option>
            {areas.data
              ?.filter((item) => item.active || inactive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </NativeSelect>
        </label>
        {canManage && (
          <Label className="min-h-11">
            <input
              type="checkbox"
              checked={inactive}
              onChange={(event) => {
                setInactive(event.target.checked);
                setArea("");
              }}
            />{" "}
            Incluir inactivas
          </Label>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={map.isFetching}
          onClick={() => void map.refetch()}
        >
          <RefreshCw className={map.isFetching ? "motion-safe:animate-spin" : undefined} aria-hidden="true" />
          Actualizar
        </Button>
      </div>
      {areas.isError && (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar el filtro por área.
        </p>
      )}
      {status.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(status.error, "No se pudo cambiar el estado.")}
        </Alert>
      )}
      {map.isPending && (
        <div role="status">
          <span className="sr-only">Cargando mesas…</span>
          <div aria-hidden="true" className={grid}>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      )}
      {map.isError && (
        <Alert variant="destructive" role="alert">
          {apiError(map.error, "No se pudo cargar el mapa.")}
        </Alert>
      )}
      {map.data?.areas.length === 0 && <p>No hay áreas para este filtro.</p>}
      {map.data?.areas.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl font-semibold">
            {section.name}
            {section.active ? "" : " (inactiva)"}
          </h2>
          {section.tables.length === 0 && (
            <p>Esta área aún no tiene mesas visibles.</p>
          )}
          <ul className={grid}>
            {section.tables.map((table) => {
              const order = table.openOrder;
              const joined =
                order?.joinedTables.filter((item) => item.id !== table.id) ??
                [];
              return (
                <Card
                  key={table.id}
                  as="li"
                >
                  <CardContent className="gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg leading-snug font-semibold">
                        {table.name || `Mesa ${table.number}`}
                      </h3>
                      <Badge
                        variant={table.active ? statuses[table.status].badge : "ghost"}
                      >
                        {table.active
                          ? statuses[table.status].label
                          : "Inactiva"}
                      </Badge>
                    </div>
                    {table.capacity != null && (
                      <p className="text-sm text-muted-foreground">{table.capacity} personas</p>
                    )}
                    {order && (
                      <div className="rounded-xl bg-muted p-3">
                        <p className="font-semibold tabular-nums">
                          Pedido #{order.number} ·{" "}
                          {money.format(Number(order.total))}
                        </p>
                        {joined.length > 0 && (
                          <p className="text-sm">
                            Unida a{" "}
                            {joined
                              .map(
                                (item) =>
                                  `${item.name || `Mesa ${item.number}`} (${item.diningArea.name})`,
                              )
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                    {role === "WAITER" &&
                      (order ? (
                        <Link
                          className={buttonVariants({ variant: "outline", className: "min-h-11" })}
                          to={`/waiter/orders/${order.id}`}
                        >
                          Ver pedido
                        </Link>
                      ) : (
                        section.active &&
                        table.active &&
                        table.status === "AVAILABLE" && (
                          <Link
                            className={buttonVariants({ className: "min-h-11" })}
                            to={`/waiter/orders/new?table=${encodeURIComponent(table.id)}`}
                          >
                            Tomar pedido
                          </Link>
                        )
                      ))}
                    {canChangeStatus &&
                      section.active &&
                      table.active &&
                      !order &&
                      table.status !== "OCCUPIED" && (
                        <Button
                          type="submit" variant="outline" className="min-h-11 self-start"
                          disabled={status.isPending}
                          onClick={() => {
                            const next =
                              table.status === "DISABLED"
                                ? "AVAILABLE"
                                : "DISABLED";
                            status.mutate({ id: table.id, status: next });
                          }}
                        >
                          {table.status === "DISABLED"
                            ? "Habilitar mesa"
                            : "Deshabilitar mesa"}
                        </Button>
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
