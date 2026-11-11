import {
  productionCodes,
  type DiningArea,
  type LocalTable,
  type ProductionArea,
} from "@/core/entities/local.entity";
import { useLocalActions } from "@/infrastructure/hooks/use-local";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type LocalEditor =
  | { kind: "production"; item?: ProductionArea }
  | { kind: "dining"; item?: DiningArea }
  | { kind: "tables"; item?: LocalTable };

const integer = z.number().int().max(2147483647);
const name = z.string().trim().max(100);
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("production"),
    name: name.min(1, "Ingresa un nombre"),
    code: z.enum(productionCodes),
  }),
  z.object({
    kind: z.literal("dining"),
    name: name.min(1, "Ingresa un nombre"),
    description: z.string().trim().max(500),
    sortOrder: integer.min(0),
  }),
  z.object({
    kind: z.literal("tables"),
    name,
    diningAreaId: z.uuid("Selecciona un área"),
    number: integer.min(1),
    capacity: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) &&
            Number(value) >= 1 &&
            Number(value) <= 2147483647),
        "Ingresa una capacidad válida",
      ),
    sortOrder: integer.min(0),
    active: z.boolean(),
  }),
]);
type Fields = z.infer<typeof schema>;

function defaults(editor: LocalEditor): Fields {
  switch (editor.kind) {
    case "production":
      return {
        kind: editor.kind,
        name: editor.item?.name ?? "",
        code: editor.item?.code ?? "KITCHEN",
      };
    case "dining":
      return {
        kind: editor.kind,
        name: editor.item?.name ?? "",
        description: editor.item?.description ?? "",
        sortOrder: editor.item?.sortOrder ?? 0,
      };
    case "tables":
      return {
        kind: editor.kind,
        name: editor.item?.name ?? "",
        diningAreaId: editor.item?.diningArea.id ?? "",
        number: editor.item?.number ?? 1,
        capacity: editor.item?.capacity?.toString() ?? "",
        sortOrder: editor.item?.sortOrder ?? 0,
        active: editor.item?.active ?? true,
      };
  }
}

export function LocalForm({
  editor,
  areas,
  close,
}: {
  editor: LocalEditor;
  areas: DiningArea[];
  close: (saved?: boolean) => void;
}) {
  const actions = useLocalActions();
  const mutation =
    editor.kind === "tables" ? actions.table : actions[editor.kind];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: defaults(editor),
  });
  return (
    <form
      className="card border border-base-300 bg-base-100"
      noValidate
      onSubmit={handleSubmit((values) => {
        const id = editor.item?.id;
        const options = { onSuccess: () => close(true) };
        if (values.kind === "production") {
          actions.production.mutate(
            { id, fields: { name: values.name, code: values.code } },
            options,
          );
        } else if (values.kind === "dining") {
          actions.dining.mutate(
            {
              id,
              fields: {
                name: values.name,
                description: values.description || null,
                sortOrder: values.sortOrder,
              },
            },
            options,
          );
        } else {
          const { name, capacity, diningAreaId, number, sortOrder, active } =
            values;
          actions.table.mutate(
            {
              id,
              fields: {
                name: name || null,
                capacity: capacity ? Number(capacity) : null,
                diningAreaId,
                number,
                sortOrder,
                active,
              },
            },
            options,
          );
        }
      })}
    >
      <div className="card-body">
        <h2 className="card-title">
          {editor.item ? "Editar" : "Crear"}{" "}
          {editor.kind === "tables" ? "mesa" : "área"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            Nombre{editor.kind === "tables" ? " (opcional)" : ""}
            <input className="input w-full" {...register("name")} />
          </label>
          {editor.kind === "production" && (
            <label className="grid gap-1">
              Destino
              <select className="select w-full" {...register("code")}>
                <option value="KITCHEN">Cocina</option>
                <option value="BAR">Barra</option>
                <option value="NONE">Sin producción</option>
              </select>
            </label>
          )}
          {editor.kind === "dining" && (
            <label className="grid gap-1">
              Descripción
              <textarea
                className="textarea w-full"
                {...register("description")}
              />
            </label>
          )}
          {editor.kind === "tables" && (
            <>
              <label className="grid gap-1">
                Área del local
                <select className="select w-full" {...register("diningAreaId")}>
                  <option value="">Selecciona un área</option>
                  {areas
                    .filter(
                      (area) =>
                        area.active || area.id === editor.item?.diningArea.id,
                    )
                    .map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                        {area.active ? "" : " (inactiva)"}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1">
                Número
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  {...register("number", { valueAsNumber: true })}
                />
              </label>
              <label className="grid gap-1">
                Capacidad (opcional)
                <input
                  inputMode="numeric"
                  className="input w-full"
                  {...register("capacity")}
                />
              </label>
              <label className="label">
                <input
                  type="checkbox"
                  className="checkbox"
                  {...register("active")}
                />{" "}
                Mesa activa
              </label>
            </>
          )}
          {editor.kind !== "production" && (
            <label className="grid gap-1">
              Orden
              <input
                type="number"
                min={0}
                className="input w-full"
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </label>
          )}
        </div>
        {Object.entries(errors).map(([field, error]) => (
          <p key={field} role="alert" className="text-sm text-error">
            {field === "sortOrder"
              ? "Orden"
              : field === "number"
                ? "Número"
                : ""}{" "}
            {error.message}
          </p>
        ))}
        {mutation.isError && (
          <p className="alert alert-error" role="alert">
            {apiError(mutation.error, "No se pudo guardar. Revisa los datos.")}
          </p>
        )}
        <div className="card-actions">
          <button className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={mutation.isPending}
            onClick={() => close()}
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
