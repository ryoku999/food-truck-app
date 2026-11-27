import { Card, CardContent } from "@/presentation/components/ui/card";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { FieldLegend, FieldSet } from "@/presentation/components/ui/field";
import { Input } from "@/presentation/components/ui/input";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Alert } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
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
const schema = details.extend({
  type: z.enum(orderTypes),
  tableIds: z.array(z.string()).max(20, "Selecciona hasta 20 mesas"),
});
type Fields = z.infer<typeof schema>;

export function OrderForm({
  order,
  initialTable,
  close,
}: {
  order?: Order;
  initialTable?: string;
  close?: () => void;
}) {
  const action = useOrderAction();
  const navigate = useNavigate();
  const map = useTableMap(undefined, false);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: order?.type ?? (initialTable ? "DINE_IN" : "TAKEAWAY"),
      tableIds:
        order?.tables.map((table) => table.id) ??
        (initialTable ? [initialTable] : []),
      customerName: order?.customerName ?? "",
      customerPhone: order?.customerPhone ?? "",
      notes: order?.notes ?? "",
    },
  });
  const type = useWatch({ control, name: "type" });
  const selected = useWatch({ control, name: "tableIds" });
  const tableAreas =
    map.data?.areas
      .map((area) => ({
        id: area.id,
        name: area.name,
        tables: area.tables.filter(
          (table) =>
            table.active &&
            (table.openOrder
              ? table.openOrder.id === order?.id
              : table.status === "AVAILABLE"),
        ),
      }))
      .filter((area) => area.tables.length > 0) ?? [];
  const candidates = tableAreas.flatMap((area) => area.tables);
  return (
    <Card
      as="form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const tableIds =
          type === "DINE_IN"
            ? values.tableIds.filter((id) =>
                candidates.some((table) => table.id === id),
              )
            : [];
        if (
          !order &&
          type === "DINE_IN" &&
          (!tableIds.length || tableIds.length !== values.tableIds.length)
        ) {
          setError("tableIds", { message: "Selecciona mesas disponibles." });
          return;
        }
        try {
          if (order) {
            const input: OrderDetails = {
              customerName: values.customerName || null,
              customerPhone: values.customerPhone || null,
              notes: values.notes || null,
            };
            await action.mutateAsync((repo) => repo.update(order.id, input));
            close?.();
          } else {
            const saved = await action.mutateAsync((repo) =>
              repo.create({
                type,
                tableIds,
                customerName: values.customerName || undefined,
                customerPhone: values.customerPhone || undefined,
                notes: values.notes || undefined,
              }),
            );
            navigate(`/waiter/orders/${saved.id}`, { replace: true });
          }
        } catch (error) {
          setError("root", {
            message: apiError(
              error,
              "No se pudo guardar. Revisa Mis pedidos antes de volver a crear.",
            ),
          });
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {order ? "Datos del pedido" : "Nuevo pedido"}
        </h2>
        {!order && (
          <label className="grid gap-1">
            Tipo
            <NativeSelect className="w-full" {...register("type")}>
              {orderTypes.map((key) => (
                <option key={key} value={key}>
                  {typeLabels[key]}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
        {!order && type === "DINE_IN" && (
          <FieldSet className="space-y-1">
            <FieldLegend className="font-semibold">Mesas</FieldLegend>
            {map.isPending && <p role="status">Cargando mesas…</p>}
            {map.isError && (
              <p role="alert" className="text-destructive">
                No se pudieron cargar las mesas.
              </p>
            )}
            {map.isSuccess && candidates.length === 0 && (
              <p>No hay mesas disponibles.</p>
            )}
            <div className="space-y-4">
              {tableAreas.map((area) => (
                <FieldSet
                  key={area.id}
                  className="rounded-xl border border-border p-3"
                >
                  <FieldLegend className="px-2 font-semibold">{area.name}</FieldLegend>
                  <div className="grid grid-cols-3 gap-2">
                    {area.tables.map((table) => (
                      <label
                        key={table.id}
                        className={`flex min-h-14 min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-2 ${selected.includes(table.id) ? "border-primary bg-accent" : "border-border bg-card"}`}
                      >
                        <input
                          type="checkbox"
                          className="shrink-0"
                          checked={selected.includes(table.id)}
                          onChange={(event) => {
                            setValue(
                              "tableIds",
                              event.target.checked
                                ? [...selected, table.id]
                                : selected.filter((id) => id !== table.id),
                              { shouldValidate: true },
                            );
                          }}
                        />
                        <span className="min-w-0 wrap-break-word text-sm">
                          {table.name || `Mesa ${table.number}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </FieldSet>
              ))}
            </div>
            {errors.tableIds?.message && (
              <p role="alert" className="text-destructive">
                {errors.tableIds.message}
              </p>
            )}
          </FieldSet>
        )}
        <label className="grid gap-1">
          Cliente (opcional)
          <Input
            className="w-full"
            maxLength={150}
            {...register("customerName")}
          />
        </label>
        <label className="grid gap-1">
          Teléfono (opcional)
          <Input
            className="w-full"
            type="tel"
            maxLength={30}
            {...register("customerPhone")}
          />
        </label>
        <label className="grid gap-1">
          Notas (opcional)
          <Textarea
            className="w-full"
            maxLength={1000}
            {...register("notes")}
          />
        </label>
        {errors.root?.message && (
          <Alert role="alert" variant="destructive">
            {errors.root.message}
          </Alert>
        )}
        <Button
          type="submit" className="min-h-11"
          disabled={
            isSubmitting || (!order && type === "DINE_IN" && !map.isSuccess)
          }
        >
          {isSubmitting
            ? "Guardando…"
            : order
              ? "Guardar datos"
              : "Crear borrador"}
        </Button>
        {close && (
          <Button
            variant="ghost"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderTablesForm({
  order,
  close,
}: {
  order: Order;
  close: () => void;
}) {
  const map = useTableMap(undefined, false);
  const action = useOrderAction();
  const {
    control,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(
      z.object({
        tableIds: z
          .array(z.string())
          .min(1, "Selecciona al menos una mesa")
          .max(20, "Selecciona hasta 20 mesas"),
      }),
    ),
    defaultValues: { tableIds: order.tables.map((table) => table.id) },
  });
  const selected = useWatch({ control, name: "tableIds" });
  return (
    <Card
      as="form"
      onSubmit={handleSubmit(async ({ tableIds }) => {
        try {
          await action.mutateAsync((repo) =>
            repo.setTables(order.id, tableIds),
          );
          close();
        } catch (error) {
          setError("root", {
            message: apiError(error, "No se pudieron actualizar las mesas."),
          });
        }
      })}
    >
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">Mesas del pedido</h2>
        {map.isPending && <p role="status">Cargando mesas…</p>}
        {map.isError && (
          <p role="alert" className="text-destructive">
            No se pudieron cargar las mesas.
          </p>
        )}
        <div className="space-y-4">
          {map.data?.areas.map((area) => {
            const tables = area.tables.filter((table) =>
              table.openOrder
                ? table.openOrder.id === order.id
                : table.active && table.status === "AVAILABLE",
            );
            if (!tables.length) return null;
            return (
              <FieldSet
                key={area.id}
                className="rounded-xl border border-border p-3"
              >
                <FieldLegend className="px-2 font-semibold">{area.name}</FieldLegend>
                <div className="grid grid-cols-3 gap-2">
                  {tables.map((table) => (
                    <label
                      key={table.id}
                      className={`flex min-h-14 min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-2 ${selected.includes(table.id) ? "border-primary bg-accent" : "border-border bg-card"}`}
                    >
                      <input
                        type="checkbox"
                        className="shrink-0"
                        checked={selected.includes(table.id)}
                        onChange={(event) => {
                          setValue(
                            "tableIds",
                            event.target.checked
                              ? [...selected, table.id]
                              : selected.filter((id) => id !== table.id),
                            { shouldValidate: true },
                          );
                        }}
                      />
                      <span className="min-w-0 wrap-break-word text-sm">
                        {table.name || `Mesa ${table.number}`}
                      </span>
                    </label>
                  ))}
                </div>
              </FieldSet>
            );
          })}
        </div>
        {(errors.tableIds?.message || errors.root?.message) && (
          <Alert role="alert" variant="destructive">
            {errors.tableIds?.message || errors.root?.message}
          </Alert>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !map.isSuccess}
        >
          Guardar mesas
        </Button>
        <Button
          variant="ghost"
          type="button"
          disabled={isSubmitting}
          onClick={close}
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
}
