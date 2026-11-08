import type { Product } from "@/core/entities/catalog.entity";
import type { OrderItem } from "@/core/entities/order.entity";
import { useOrderAction } from "@/infrastructure/hooks/use-orders";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const itemFields = z.object({ quantity: z.number().int().min(1, "Ingresa al menos una unidad").max(999), notes: z.string().trim().max(1000) });
const addFields = itemFields.extend({
  variant: z.string(), options: z.array(z.string()).max(50), combos: z.record(z.string(), z.array(z.string()).max(20)),
});

export function AddItemForm({ id, product, close }: { id: string; product: Product; close: () => void }) {
  const action = useOrderAction();
  const groups = product.modifierGroups.filter(group => group.active);
  const variants = product.variants.filter(variant => variant.active && variant.available);
  const { register, control, setValue, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(addFields),
    defaultValues: { quantity: 1, notes: "", variant: "", options: [] as string[], combos: {} as Record<string, string[]> },
  });
  const options = useWatch({ control, name: "options" });
  const combos = useWatch({ control, name: "combos" });
  const message = [errors.root?.message, errors.quantity?.message, errors.options?.message, errors.combos?.message]
    .find((value): value is string => typeof value === "string");
  return <form className="card border border-base-300 bg-base-100" noValidate onSubmit={handleSubmit(async values => {
    clearErrors("root");
    for (const group of groups) {
      const count = group.options.filter(option => values.options.includes(option.id)).length;
      if (((group.required || count > 0) && count < group.minSelections) || (group.maxSelections != null && count > group.maxSelections)) {
        setError("root", { message: `Revisa las opciones de «${group.name}».` }); return;
      }
    }
    for (const group of product.comboGroups) {
      const count = values.combos[group.id]?.length ?? 0;
      if (count < group.minSelections || count > group.maxSelections) {
        setError("root", { message: `Selecciona entre ${group.minSelections} y ${group.maxSelections} en «${group.name}».` }); return;
      }
    }
    try {
      await action.mutateAsync(repo => repo.addItem(id, {
        productId: product.id, productVariantId: values.variant || undefined, quantity: values.quantity, notes: values.notes || undefined,
        modifierOptionIds: values.options,
        comboSelections: Object.entries(values.combos).filter(([, selected]) => selected.length > 0).map(([comboGroupId, comboGroupItemIds]) => ({ comboGroupId, comboGroupItemIds })),
      }));
      close();
    } catch (error) { setError("root", { message: apiError(error, "No se confirmó el agregado. Revisa la comanda antes de repetirlo.") }); }
  })}><div className="card-body">
    <h3 className="card-title">{product.name}</h3>
    <fieldset className="grid gap-3" disabled={isSubmitting}>
      {variants.length > 0 && <label className="grid gap-1">Variante<select className="select w-full" {...register("variant")}>
        <option value="">Presentación base · {product.basePrice}</option>
        {variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {variant.price}</option>)}
      </select></label>}
      {groups.map(group => {
        const selected = group.options.filter(option => options.includes(option.id));
        return <fieldset key={group.id} className="rounded-box border border-base-300 p-3">
          <legend className="px-1 font-semibold">{group.name}</legend>
          <p className="text-sm">{group.required ? "Obligatorio" : "Opcional"} · {group.minSelections} a {group.maxSelections ?? "sin límite"}</p>
          {group.options.filter(option => option.active && option.available).map(option => <label key={option.id} className="label flex min-h-11 justify-start whitespace-normal">
            <input className="checkbox" type="checkbox" checked={options.includes(option.id)} disabled={!options.includes(option.id) && group.maxSelections !== null && group.maxSelections > 1 && selected.length >= group.maxSelections} onChange={event => {
              const next = event.target.checked
                ? [...options.filter(value => group.maxSelections !== 1 || !selected.some(item => item.id === value)), option.id]
                : options.filter(value => value !== option.id);
              setValue("options", next);
            }} /> {option.name} · {option.priceDelta}
          </label>)}
        </fieldset>;
      })}
      {product.comboGroups.map(group => <fieldset key={group.id} className="rounded-box border border-base-300 p-3">
        <legend className="px-1 font-semibold">{group.name}</legend>
        <p className="text-sm">Elige de {group.minSelections} a {group.maxSelections}</p>
        {group.items.filter(item => item.active).map(item => {
          const selected = combos[group.id] ?? [];
          return <label key={item.id} className="label flex min-h-11 justify-start whitespace-normal">
            <input type="checkbox" className="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id) && group.maxSelections > 1 && selected.length >= group.maxSelections} onChange={event => {
              setValue("combos", { ...combos, [group.id]: event.target.checked ? [...(group.maxSelections === 1 ? [] : selected), item.id] : selected.filter(value => value !== item.id) });
            }} /> {item.productNameSnapshot} · adicional {item.additionalPrice}
          </label>;
        })}
      </fieldset>)}
      <label className="grid gap-1">Cantidad<input type="number" inputMode="numeric" min={1} className="input w-full" {...register("quantity", { valueAsNumber: true })} /></label>
      <label className="grid gap-1">Notas<textarea maxLength={1000} className="textarea w-full" {...register("notes")} /></label>
    </fieldset>
    {message && <p className="alert alert-error" role="alert">{message}</p>}
    <button className="btn btn-primary min-h-11" disabled={isSubmitting}>{isSubmitting ? "Agregando…" : "Agregar a la comanda"}</button>
    <button type="button" className="btn btn-ghost min-h-11" disabled={isSubmitting} onClick={close}>Cancelar</button>
  </div></form>;
}

export function EditItemForm({ id, item, close }: { id: string; item: OrderItem; close: () => void }) {
  const action = useOrderAction();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(itemFields), defaultValues: { quantity: item.quantity, notes: item.notes ?? "" },
  });
  return <form className="space-y-3" noValidate onSubmit={handleSubmit(async values => {
    try { await action.mutateAsync(repo => repo.updateItem(id, item.id, { quantity: values.quantity, notes: values.notes || null })); close(); }
    catch (error) { setError("root", { message: apiError(error, "No se pudo editar el ítem.") }); }
  })}>
    <label className="grid gap-1">Cantidad<input type="number" inputMode="numeric" min={1} className="input w-full" {...register("quantity", { valueAsNumber: true })} /></label>
    <label className="grid gap-1">Notas<textarea className="textarea w-full" maxLength={1000} {...register("notes")} /></label>
    {(errors.root?.message || errors.quantity?.message) && <p role="alert" className="text-error">{errors.root?.message || errors.quantity?.message}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-primary" disabled={isSubmitting}>Guardar ítem</button>
      <button className="btn btn-ghost" type="button" disabled={isSubmitting} onClick={close}>Cancelar</button>
    </div>
  </form>;
}
