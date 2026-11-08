import type { CashMovement, CashRegister, CashSession, MovementInput, OrderPayments, Payment, PaymentInput, PaymentMethod, PaymentMethodInput } from "../entities/cashier.entity";
import type { BillPartInput, BillParts } from "../entities/cashier.entity";

export interface CashierRepository {
  methods(signal?: AbortSignal): Promise<PaymentMethod[]>;
  registers(signal?: AbortSignal): Promise<CashRegister[]>;
  session(id: string, signal?: AbortSignal): Promise<CashSession>;
  open(registerId: string, amount: number, notes?: string): Promise<CashSession>;
  close(id: string, amount: number, notes?: string): Promise<CashSession>;
  movement(id: string, input: MovementInput): Promise<CashMovement>;
  payments(orderId: string, signal?: AbortSignal): Promise<OrderPayments>;
  billParts(orderId: string, signal?: AbortSignal): Promise<BillParts>;
  createBillPart(orderId: string, input: BillPartInput): Promise<BillParts>;
  removeBillPart(orderId: string, partId: string): Promise<BillParts>;
  pay(orderId: string, input: PaymentInput): Promise<Payment>;
  cancel(paymentId: string, reason: string): Promise<Payment>;
  saveMethod(input: PaymentMethodInput, id?: string): Promise<PaymentMethod>;
  methodActive(id: string, active: boolean): Promise<PaymentMethod>;
  saveRegister(input: { name?: string; active?: boolean }, id?: string): Promise<CashRegister>;
}
