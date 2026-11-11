import type { AgentToken, Printer, PrinterAgent, PrinterInput, PrintJob, PrintJobDetail, PrintJobFilters, PrintJobPage } from "../entities/printing.entity";

export interface PrintingRepository {
  printers(signal?: AbortSignal): Promise<Printer[]>;
  agents(signal?: AbortSignal): Promise<PrinterAgent[]>;
  savePrinter(input: PrinterInput, id?: string): Promise<Printer>;
  createAgent(name: string): Promise<AgentToken>;
  updateAgent(id: string, input: { name?: string; active?: boolean }): Promise<void>;
  rotateAgent(id: string): Promise<AgentToken>;
  jobs(params: PrintJobFilters, signal?: AbortSignal): Promise<PrintJobPage>;
  job(id: string, signal?: AbortSignal): Promise<PrintJobDetail>;
  retry(id: string): Promise<PrintJob>;
  test(id: string, message?: string): Promise<PrintJob>;
  prebill(orderId: string, printerId?: string, copyId?: string): Promise<PrintJob>;
  ticket(orderId: string, printerId?: string): Promise<PrintJob>;
  receipt(paymentId: string): Promise<PrintJob>;
  partTicket(orderId: string, partId: string): Promise<PrintJob>;
}
