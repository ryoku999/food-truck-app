import type { OrderType } from "./order.entity";

export const printerPurposes = [
  "KITCHEN",
  "BAR",
  "CASHIER",
  "GENERAL",
] as const;
export const printStatuses = [
  "PENDING",
  "PROCESSING",
  "PRINTED",
  "FAILED",
  "CANCELLED",
] as const;
export type PrinterPurpose = (typeof printerPurposes)[number];
export type PrintStatus = (typeof printStatuses)[number];
export type PrinterInput = {
  name: string;
  purpose: PrinterPurpose;
  connectionType: "NETWORK_TCP" | "SYSTEM_PRINTER";
  fallbackEnabled?: boolean;
  host?: string;
  port?: number;
  systemName?: string;
  paperWidth: 58 | 80;
  active: boolean;
  printerAgentId: string | null;
  productionAreaId: string | null;
};
export type Printer = Omit<
  PrinterInput,
  "host" | "port" | "systemName" | "connectionType"
> & {
  id: string;
  host: string | null;
  port: number | null;
  systemName: string | null;
  connectionType: PrinterInput["connectionType"] | "USB";
};
export type PrinterAgent = {
  id: string;
  name: string;
  active: boolean;
  online: boolean;
  lastSeenAt: string | null;
};
export type AgentToken = { id: string; token: string };
export type LocalPrinterHealth = {
  ok: boolean;
  service: string;
  time: string;
};
export type LocalNetworkPrinter = {
  host: string;
  port: number;
  connectionType: "NETWORK_TCP";
  latencyMs: number;
};
export type LocalSystemPrinter = {
  name: string;
  portName: string;
  driverName?: string;
  status: number;
};
export type LocalPrinterDiscovery = {
  network: LocalNetworkPrinter[];
  system: LocalSystemPrinter[];
  requestedNetwork: string;
  port: number;
  scannedAt: string;
};
export type PrintJob = {
  id: string;
  printerId: string;
  orderId: string | null;
  printer?: { name: string };
  order?: {
    number: number;
    type: OrderType;
    tables: { table: { name: string | null; number: number } }[];
  } | null;
  type:
    | "KITCHEN_COMMAND"
    | "BAR_COMMAND"
    | "CUSTOMER_TICKET"
    | "PREBILL"
    | "PAYMENT_RECEIPT"
    | "PART_TICKET"
    | "CASH_REPORT"
    | "TEST";
  status: PrintStatus;
  attempts: number;
  error: string | null;
  payload: unknown;
  createdAt: string;
  processingAt: string | null;
  printedAt: string | null;
  failedAt: string | null;
};
export type PrintJobDetail = PrintJob & {
  items: { printJobId: string; orderItemId: string }[];
};
export type CommandPrintJob = Pick<PrintJob, "id" | "status"> & {
  type: "KITCHEN_COMMAND" | "BAR_COMMAND";
  roundNumber: number | null;
};
export type RetryPrintJob = {
  printerId?: string;
  confirmedMissingPaper?: boolean;
};
export type PrintJobFilters = {
  status?: PrintStatus;
  orderId?: string;
  orderNumber?: string;
  ticketNumber?: string;
  limit: number;
  offset: number;
};
export type PrintJobPage = {
  items: PrintJob[];
  total: number;
  limit: number;
  offset: number;
};
export const canRetryPrintJob = (job: PrintJob) =>
  job.status === "FAILED" && !!job.error?.startsWith("RETRYABLE: ");
export const printInProgress = (job: PrintJob) =>
  job.status === "PENDING" || job.status === "PROCESSING";
