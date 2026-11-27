import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { NativeSelect } from "@/presentation/components/ui/native-select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Label } from "@/presentation/components/ui/label";
import { Alert } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
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
    <Card
      as="form"
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
      <CardContent>
        <h2 className="text-lg leading-snug font-semibold">
          {editor.item ? "Editar" : "Crear"}{" "}
          {editor.kind === "tables" ? "mesa" : "área"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            Nombre{editor.kind === "tables" ? " (opcional)" : ""}
            <Input className="w-full" {...register("name")} />
          </label>
          {editor.kind === "production" && (
            <label className="grid gap-1">
              Destino
              <NativeSelect className="w-full" {...register("code")}>
                <option value="KITCHEN">Cocina</option>
                <option value="BAR">Barra</option>
                <option value="NONE">Sin producción</option>
              </NativeSelect>
            </label>
          )}
          {editor.kind === "dining" && (
            <label className="grid gap-1">
              Descripción
              <Textarea
                className="w-full"
                {...register("description")}
              />
            </label>
          )}
          {editor.kind === "tables" && (
            <>
              <label className="grid gap-1">
                Área del local
                <NativeSelect className="w-full" {...register("diningAreaId")}>
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
                </NativeSelect>
              </label>
              <label className="grid gap-1">
                Número
                <Input
                  type="number"
                  min={1}
                  className="w-full"
                  {...register("number", { valueAsNumber: true })}
                />
              </label>
              <label className="grid gap-1">
                Capacidad (opcional)
                <Input
                  inputMode="numeric"
                  className="w-full"
                  {...register("capacity")}
                />
              </label>
              <Label>
                <input
                  type="checkbox"
                  {...register("active")}
                />{" "}
                Mesa activa
              </Label>
            </>
          )}
          {editor.kind !== "production" && (
            <label className="grid gap-1">
              Orden
              <Input
                type="number"
                min={0}
                className="w-full"
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </label>
          )}
        </div>
        {Object.entries(errors).map(([field, error]) => (
          <p key={field} role="alert" className="text-sm text-destructive">
            {field === "sortOrder"
              ? "Orden"
              : field === "number"
                ? "Número"
                : ""}{" "}
            {error.message}
          </p>
        ))}
        {mutation.isError && (
          <Alert variant="destructive" role="alert">
            {apiError(mutation.error, "No se pudo guardar. Revisa los datos.")}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => close()}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
