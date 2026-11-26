import type {
  PrinterPurpose,
  PrintJob,
  PrintStatus,
} from "@/core/entities/printing.entity";
import { typeLabels } from "../waiter/order-labels";

export const purposeLabels: Record<PrinterPurpose, string> = {
  KITCHEN: "Cocina (configuración anterior)",
  BAR: "Barra (configuración anterior)",
  CASHIER: "Caja",
  GENERAL: "Comandas de cocina y barra",
};
export const printStatusLabels: Record<PrintStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  PRINTED: "Confirmado por agente",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};
export const jobLabels: Record<PrintJob["type"], string> = {
  KITCHEN_COMMAND: "Comanda de cocina",
  BAR_COMMAND: "Comanda de barra",
  CUSTOMER_TICKET: "Ticket de cliente",
  PREBILL: "Precuenta",
  PAYMENT_RECEIPT: "Recibo de abono",
  PART_TICKET: "Ticket de parte",
  CASH_REPORT: "Reporte de caja",
  TEST: "Prueba",
};
export const printDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));

export function printContent(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("lines" in payload) ||
    !Array.isArray(payload.lines)
  )
    return [];
  return payload.lines.filter(
    (line): line is string => typeof line === "string",
  );
}

export function printDocumentNumber(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("headerLines" in payload) ||
    typeof payload.headerLines !== "number"
  )
    return;
  // Formatted documents put their printed reference right after the header.
  return /^Nro\. ([A-Z0-9]+)$/.exec(
    printContent(payload)[payload.headerLines] ?? "",
  )?.[1];
}

export function printOrderContext(order: NonNullable<PrintJob["order"]>) {
  return (
    order.tables
      .map(({ table }) => table.name || `Mesa ${table.number}`)
      .join(", ") || typeLabels[order.type]
  );
}
