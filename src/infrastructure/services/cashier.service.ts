import http from "@/config/http/axios";
import type { CashierRepository } from "@/core/contracts/cashier.repository";
import type {
  CashMovement,
  CashRegister,
  CashSession,
  MovementInput,
  OrderPayments,
  Payment,
  PaymentInput,
  PaymentMethod,
  PaymentMethodInput,
} from "@/core/entities/cashier.entity";
import type { BillPartInput, BillParts } from "@/core/entities/cashier.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class CashierService implements CashierRepository {
  private async get<T>(path: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<T>>(path, { signal })).data.data;
  }
  private async write<T>(method: "post" | "patch", url: string, data: object) {
    return (await http.request<ApiEnvelope<T>>({ method, url, data })).data
      .data;
  }
  methods(signal?: AbortSignal) {
    return this.get<PaymentMethod[]>("/payment-methods", signal);
  }
  registers(signal?: AbortSignal) {
    return this.get<CashRegister[]>("/cash-registers", signal);
  }
  session(id: string, signal?: AbortSignal) {
    return this.get<CashSession>(`/cash-sessions/${id}`, signal);
  }
  open(cashRegisterId: string, openingAmount: number, notes?: string) {
    return this.write<CashSession>("post", "/cash-sessions/open", {
      cashRegisterId,
      openingAmount,
      notes,
    });
  }
  close(id: string, actualAmount: number, notes?: string) {
    return this.write<CashSession>("post", `/cash-sessions/${id}/close`, {
      actualAmount,
      notes,
    });
  }
  movement(id: string, input: MovementInput) {
    return this.write<CashMovement>(
      "post",
      `/cash-sessions/${id}/movements`,
      input,
    );
  }
  payments(id: string, signal?: AbortSignal) {
    return this.get<OrderPayments>(`/orders/${id}/payments`, signal);
  }
  billParts(id: string, signal?: AbortSignal) {
    return this.get<BillParts>(`/orders/${id}/bill-parts`, signal);
  }
  createBillPart(id: string, input: BillPartInput) {
    return this.write<BillParts>("post", `/orders/${id}/bill-parts`, input);
  }
  async removeBillPart(id: string, partId: string) {
    return (
      await http.delete<ApiEnvelope<BillParts>>(
        `/orders/${id}/bill-parts/${partId}`,
      )
    ).data.data;
  }
  pay(id: string, input: PaymentInput) {
    return this.write<Payment>("post", `/orders/${id}/payments`, input);
  }
  cancel(id: string, reason: string) {
    return this.write<Payment>("post", `/payments/${id}/cancel`, { reason });
  }
  saveMethod(input: PaymentMethodInput, id?: string) {
    return this.write<PaymentMethod>(
      id ? "patch" : "post",
      id ? `/payment-methods/${id}` : "/payment-methods",
      input,
    );
  }
  methodActive(id: string, active: boolean) {
    return this.write<PaymentMethod>("patch", `/payment-methods/${id}/status`, {
      active,
    });
  }
  saveRegister(input: { name?: string; active?: boolean }, id?: string) {
    return this.write<CashRegister>(
      id ? "patch" : "post",
      id ? `/cash-registers/${id}` : "/cash-registers",
      input,
    );
  }
}
export const cashierService = new CashierService();
