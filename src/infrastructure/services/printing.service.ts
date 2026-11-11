import http from "@/config/http/axios";
import type { PrintingRepository } from "@/core/contracts/printing.repository";
import type { AgentToken, Printer, PrinterAgent, PrinterInput, PrintJob, PrintJobDetail, PrintJobFilters, PrintJobPage } from "@/core/entities/printing.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class PrintingService implements PrintingRepository {
  private async get<T>(url: string, signal?: AbortSignal, params?: PrintJobFilters) {
    return (await http.get<ApiEnvelope<T>>(url, { signal, params })).data.data;
  }
  private async write<T>(method: "post" | "patch", url: string, data: object = {}) {
    return (await http.request<ApiEnvelope<T>>({ method, url, data })).data.data;
  }
  printers(signal?: AbortSignal) { return this.get<Printer[]>("/printers", signal); }
  agents(signal?: AbortSignal) { return this.get<PrinterAgent[]>("/printer-agents", signal); }
  savePrinter(input: PrinterInput, id?: string) { return this.write<Printer>(id ? "patch" : "post", id ? `/printers/${id}` : "/printers", input); }
  createAgent(name: string) { return this.write<AgentToken>("post", "/printer-agents", { name }); }
  async updateAgent(id: string, input: { name?: string; active?: boolean }) { await this.write("patch", `/printer-agents/${id}`, input); }
  rotateAgent(id: string) { return this.write<AgentToken>("post", `/printer-agents/${id}/rotate-token`); }
  jobs(params: PrintJobFilters, signal?: AbortSignal) { return this.get<PrintJobPage>("/print-jobs", signal, params); }
  job(id: string, signal?: AbortSignal) { return this.get<PrintJobDetail>(`/print-jobs/${id}`, signal); }
  retry(id: string) { return this.write<PrintJob>("post", `/print-jobs/${id}/retry`); }
  test(id: string, message?: string) { return this.write<PrintJob>("post", `/printers/${id}/test`, { message }); }
  prebill(orderId: string, printerId?: string, copyId?: string) { return this.write<PrintJob>("post", `/orders/${orderId}/print-prebill`, { printerId, copyId }); }
  ticket(orderId: string, printerId?: string) { return this.write<PrintJob>("post", `/orders/${orderId}/print-ticket`, { printerId }); }
  receipt(paymentId: string) { return this.write<PrintJob>("post", `/payments/${paymentId}/print-receipt`); }
  partTicket(orderId: string, partId: string) { return this.write<PrintJob>("post", `/orders/${orderId}/bill-parts/${partId}/print-ticket`); }
}
export const printingService = new PrintingService();
