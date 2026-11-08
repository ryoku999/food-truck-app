import { z } from "zod";
import type { MovementType } from "@/core/entities/cashier.entity";

export const amountRule = z.string().trim().regex(/^-?\d{1,8}([.,]\d{1,2})?$/, "Ingresa un monto con hasta dos decimales");
export const amountNumber = (value: string) => Number(value.replace(",", "."));
export const cents = (value: string) => Math.round(amountNumber(value) * 100);
export const movementLabels: Record<MovementType, string> = {
  OPENING: "Fondo inicial", SALE: "Venta", INCOME: "Ingreso", EXPENSE: "Egreso", WITHDRAWAL: "Retiro", ADJUSTMENT: "Ajuste",
};
