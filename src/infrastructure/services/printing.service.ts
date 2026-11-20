import http from "@/config/http/axios";
import type { PrintingRepository } from "@/core/contracts/printing.repository";
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
} from "@/core/entities/printing.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class PrintingService implements PrintingRepository {
  private async get<T>(
    url: string,
    signal?: AbortSignal,
    params?: PrintJobFilters,
  ) {
    return (await http.get<ApiEnvelope<T>>(url, { signal, params })).data.data;
  }
  private async write<T>(
    method: "post" | "patch" | "delete",
    url: string,
    data: object = {},
  ) {
    return (await http.request<ApiEnvelope<T>>({ method, url, data })).data
      .data;
  }
  private async local<T>(path: string, init?: RequestInit) {
    const response = await fetch(`http://127.0.0.1:17890/api${path}`, init);
    const body = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new Error(body.error || `API local HTTP ${response.status}`);
    return body as T;
  }
  printers(signal?: AbortSignal) {
    return this.get<Printer[]>("/printers", signal);
  }
  agents(signal?: AbortSignal) {
    return this.get<PrinterAgent[]>("/printer-agents", signal);
  }
  savePrinter(input: PrinterInput, id?: string) {
    return this.write<Printer>(
      id ? "patch" : "post",
      id ? `/printers/${id}` : "/printers",
      input,
    );
  }
  async deletePrinter(id: string) {
    await this.write<{ id: string; deleted: boolean }>("delete", `/printers/${id}`);
  }
  createAgent(name: string) {
    return this.write<AgentToken>("post", "/printer-agents", { name });
  }
  async updateAgent(id: string, input: { name?: string; active?: boolean }) {
    await this.write("patch", `/printer-agents/${id}`, input);
  }
  rotateAgent(id: string) {
    return this.write<AgentToken>("post", `/printer-agents/${id}/rotate-token`);
  }
  jobs(params: PrintJobFilters, signal?: AbortSignal) {
    return this.get<PrintJobPage>("/print-jobs", signal, params);
  }
  job(id: string, signal?: AbortSignal) {
    return this.get<PrintJobDetail>(`/print-jobs/${id}`, signal);
  }
  retry(id: string, printerId?: string) {
    return this.write<PrintJob>("post", `/print-jobs/${id}/retry`, { printerId });
  }
  retryPrinters(id: string, signal?: AbortSignal) {
    return this.get<Pick<Printer, "id" | "name">[]>(`/print-jobs/${id}/retry-printers`, signal);
  }
  test(id: string, message?: string) {
    return this.write<PrintJob>("post", `/printers/${id}/test`, { message });
  }
  prebill(orderId: string, printerId?: string, copyId?: string) {
    return this.write<PrintJob>("post", `/orders/${orderId}/print-prebill`, {
      printerId,
      copyId,
    });
  }
  ticket(orderId: string, printerId?: string) {
    return this.write<PrintJob>("post", `/orders/${orderId}/print-ticket`, {
      printerId,
    });
  }
  receipt(paymentId: string) {
    return this.write<PrintJob>("post", `/payments/${paymentId}/print-receipt`);
  }
  partTicket(orderId: string, partId: string, copyId?: string) {
    return this.write<PrintJob>(
      "post",
      `/orders/${orderId}/bill-parts/${partId}/print-ticket`,
      { copyId },
    );
  }
  localHealth(signal?: AbortSignal) {
    return this.local<LocalPrinterHealth>("/health", { signal });
  }
  discoverLocal(network: string, port: number) {
    return this.local<LocalPrinterDiscovery>("/printers/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, port }),
    });
  }
}
export const printingService = new PrintingService();
