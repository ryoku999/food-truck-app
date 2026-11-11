import { useCancelOrder } from "@/infrastructure/hooks/use-orders";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  quantity: z.number().int("Ingresa una cantidad entera").min(1, "Selecciona al menos una unidad"),
  reason: z.string().trim().min(1, "Indica el motivo de la cancelación").max(500),
  confirmed: z.boolean().refine(value => value, "Confirma la cancelación"),
});

export function CancelOrderForm({ id, number, close, complete, item }: {
  id: string; number: number; close: () => void; complete: () => void;
  item?: { id: string; name: string; quantity: number };
}) {
  const action = useCancelOrder();
  const { register, control, setValue, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), defaultValues: { reason: "", confirmed: false, quantity: 1 },
  });
  const quantity = useWatch({ control, name: "quantity" });
  return <form className="space-y-3 rounded-box border border-error bg-base-100 p-4" noValidate onSubmit={handleSubmit(async ({ reason, quantity }) => {
    if (item && quantity > item.quantity) {
      setError("quantity", { message: "La cantidad supera las unidades disponibles." }); return;
    }
    try { await action.mutateAsync({ id, reason, itemId: item?.id, quantity: item ? quantity : undefined }); complete(); }
    catch (error) { setError("root", { message: apiError(error, "No se confirmó la cancelación. Actualiza la cuenta antes de volver a intentarlo.") }); }
  })}>
    <h2 className="text-xl font-semibold">{item ? `Cancelar producto del pedido #${number}` : `Cancelar pedido #${number} y liberar mesas`}</h2>
    <p>{item ? `Se cancelarán ${Number.isInteger(quantity) && quantity > 0 ? quantity : "…"} de las ${item.quantity} unidades de «${item.name}» de esta línea. El total se recalculará y Cocina y Barra recibirán la actualización.` : "Se cancelarán todos los productos del pedido y se liberarán sus mesas. Cocina y Barra recibirán la actualización."}</p>
    <fieldset className="space-y-3" disabled={isSubmitting}>
      {item && <label className="grid gap-1">Unidades a cancelar (máximo {item.quantity})
        <input type="number" inputMode="numeric" min={1} max={item.quantity} step={1} className="input w-full" aria-invalid={!!errors.quantity}
          {...register("quantity", { valueAsNumber: true, onChange: () => setValue("confirmed", false) })} />
      </label>}
      {errors.quantity && <p role="alert" className="text-error">{errors.quantity.message}</p>}
      <label className="grid gap-1">Motivo obligatorio
        <textarea className="textarea w-full" maxLength={500} aria-invalid={!!errors.reason} {...register("reason")} />
      </label>
      {errors.reason && <p className="text-error" role="alert">{errors.reason.message}</p>}
      <label className="flex min-h-11 items-start gap-2">
        <input type="checkbox" className="checkbox mt-1 shrink-0" {...register("confirmed")} />
        <span>{item ? `Confirmo que quiero cancelar ${Number.isInteger(quantity) && quantity > 0 ? quantity : "…"} × ${item.name}.` : `Confirmo que quiero cancelar todo el pedido #${number} y liberar sus mesas.`}</span>
      </label>
      {errors.confirmed && <p className="text-error" role="alert">{errors.confirmed.message}</p>}
      {errors.root && <p role="alert" className="alert alert-error">{errors.root.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-error min-h-11">{isSubmitting ? "Cancelando…" : item ? "Confirmar cancelación del producto" : "Confirmar cancelación y liberar mesas"}</button>
        <button type="button" className="btn btn-ghost min-h-11" onClick={close}>Volver a la cuenta</button>
      </div>
    </fieldset>
  </form>;
}
