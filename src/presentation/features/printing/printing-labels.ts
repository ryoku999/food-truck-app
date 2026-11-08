import type { PrinterPurpose, PrintJob, PrintStatus } from "@/core/entities/printing.entity";

export const purposeLabels: Record<PrinterPurpose, string> = { KITCHEN: "Cocina", BAR: "Barra", CASHIER: "Caja", GENERAL: "General" };
export const printStatusLabels: Record<PrintStatus, string> = { PENDING: "Pendiente", PROCESSING: "En proceso", PRINTED: "Confirmado por agente", FAILED: "Fallido", CANCELLED: "Cancelado" };
export const jobLabels: Record<PrintJob["type"], string> = { KITCHEN_COMMAND: "Comanda de cocina", BAR_COMMAND: "Comanda de barra", CUSTOMER_TICKET: "Ticket de cliente", PAYMENT_RECEIPT: "Recibo de abono", PART_TICKET: "Ticket de parte", CASH_REPORT: "Reporte de caja", TEST: "Prueba" };
export const printDate = (value: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
