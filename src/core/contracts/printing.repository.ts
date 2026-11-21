import type {
  AgentToken,
  Printer,
  PrinterAgent,
  PrinterInput,
  PrintJob,
  PrintJobDetail,
  PrintJobFilters,
  PrintJobPage,
  LocalPrinterDiscovery,
  LocalPrinterHealth,
} from "../entities/printing.entity";

export interface PrintingRepository {
  printers(signal?: AbortSignal): Promise<Printer[]>;
  agents(signal?: AbortSignal): Promise<PrinterAgent[]>;
  savePrinter(input: PrinterInput, id?: string): Promise<Printer>;
  deletePrinter(id: string): Promise<void>;
  createAgent(name: string): Promise<AgentToken>;
  updateAgent(
    id: string,
    input: { name?: string; active?: boolean },
  ): Promise<void>;
  rotateAgent(id: string): Promise<AgentToken>;
  jobs(params: PrintJobFilters, signal?: AbortSignal): Promise<PrintJobPage>;
  job(id: string, signal?: AbortSignal): Promise<PrintJobDetail>;
  retry(id: string, printerId?: string): Promise<PrintJob>;
  retryPrinters(id: string, signal?: AbortSignal): Promise<Pick<Printer, "id" | "name">[]>;
  test(id: string, message?: string): Promise<PrintJob>;
  prebill(
    orderId: string,
    printerId?: string,
    copyId?: string,
  ): Promise<PrintJob>;
  ticket(orderId: string, printerId?: string): Promise<PrintJob>;
  receipt(paymentId: string): Promise<PrintJob>;
  partTicket(orderId: string, partId: string, copyId?: string): Promise<PrintJob>;
  localHealth(signal?: AbortSignal): Promise<LocalPrinterHealth>;
  discoverLocal(network: string, port: number): Promise<LocalPrinterDiscovery>;
}
