import { FieldSet } from "@/presentation/components/ui/field";
import { Input } from "@/presentation/components/ui/input";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Alert } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { useCancelOrder } from "@/infrastructure/hooks/use-orders";
import { apiError } from "@/shared/utils/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  quantity: z
    .number()
    .int("Ingresa una cantidad entera")
    .min(1, "Selecciona al menos una unidad"),
  reason: z
    .string()
    .trim()
    .min(1, "Indica el motivo de la cancelación")
    .max(500),
  confirmed: z.boolean().refine((value) => value, "Confirma la cancelación"),
});

export function CancelOrderForm({
  id,
  number,
  close,
  complete,
  item,
}: {
  id: string;
  number: number;
  close: () => void;
  complete: () => void;
  item?: { id: string; name: string; quantity: number };
}) {
  const action = useCancelOrder();
  const {
    register,
    control,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", confirmed: false, quantity: 1 },
  });
  const quantity = useWatch({ control, name: "quantity" });
  return (
    <form
      className="space-y-3 rounded-xl border border-destructive bg-card p-4"
      noValidate
      onSubmit={handleSubmit(async ({ reason, quantity }) => {
        if (item && quantity > item.quantity) {
          setError("quantity", {
            message: "La cantidad supera las unidades disponibles.",
          });
          return;
        }
        try {
          await action.mutateAsync({
            id,
            reason,
            itemId: item?.id,
            quantity: item ? quantity : undefined,
          });
          complete();
        } catch (error) {
          setError("root", {
            message: apiError(
              error,
              "No se confirmó la cancelación. Actualiza la cuenta antes de volver a intentarlo.",
            ),
          });
        }
      })}
    >
      <h2 className="text-xl font-semibold">
        {item
          ? `Cancelar producto del pedido #${number}`
          : `Cancelar pedido #${number} y liberar mesas`}
      </h2>
      <p>
        {item
          ? `Se cancelarán ${Number.isInteger(quantity) && quantity > 0 ? quantity : "…"} de las ${item.quantity} unidades de «${item.name}» de esta línea. El total se recalculará y Cocina y Barra recibirán la actualización.`
          : "Se cancelarán todos los productos del pedido y se liberarán sus mesas. Cocina y Barra recibirán la actualización."}
      </p>
      <FieldSet className="space-y-3" disabled={isSubmitting}>
        {item && (
          <label className="grid gap-1">
            Unidades a cancelar (máximo {item.quantity})
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={item.quantity}
              step={1}
              className="w-full"
              aria-invalid={!!errors.quantity}
              {...register("quantity", {
                valueAsNumber: true,
                onChange: () => setValue("confirmed", false),
              })}
            />
          </label>
        )}
        {errors.quantity && (
          <p role="alert" className="text-destructive">
            {errors.quantity.message}
          </p>
        )}
        <label className="grid gap-1">
          Motivo obligatorio
          <Textarea
            className="w-full"
            maxLength={500}
            aria-invalid={!!errors.reason}
            {...register("reason")}
          />
        </label>
        {errors.reason && (
          <p className="text-destructive" role="alert">
            {errors.reason.message}
          </p>
        )}
        <label className="flex min-h-11 items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            {...register("confirmed")}
          />
          <span>
            {item
              ? `Confirmo que quiero cancelar ${Number.isInteger(quantity) && quantity > 0 ? quantity : "…"} × ${item.name}.`
              : `Confirmo que quiero cancelar todo el pedido #${number} y liberar sus mesas.`}
          </span>
        </label>
        {errors.confirmed && (
          <p className="text-destructive" role="alert">
            {errors.confirmed.message}
          </p>
        )}
        {errors.root && (
          <Alert role="alert" variant="destructive">
            {errors.root.message}
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" className="min-h-11">
            {isSubmitting
              ? "Cancelando…"
              : item
                ? "Confirmar cancelación del producto"
                : "Confirmar cancelación y liberar mesas"}
          </Button>
          <Button
            type="button"
            variant="ghost" className="min-h-11"
            onClick={close}
          >
            Volver a la cuenta
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
