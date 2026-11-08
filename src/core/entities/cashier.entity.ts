export const paymentCodes = ["CASH", "YAPE", "PLIN", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export const manualMovements = ["INCOME", "EXPENSE", "WITHDRAWAL", "ADJUSTMENT"] as const;
export type PaymentCode = typeof paymentCodes[number];
export type ManualMovement = typeof manualMovements[number];
export type MovementType = ManualMovement | "OPENING" | "SALE";
export type PaymentMethod = { id: string; name: string; code: PaymentCode; active: boolean; sortOrder: number };
export type PaymentMethodInput = Omit<PaymentMethod, "id" | "active">;
export type CashRegister = { id: string; name: string; active: boolean; currentSession: { id: string; openedAt: string } | null };
export type CashMovement = { id: string; type: MovementType; amount: string; description: string | null; createdAt: string };
export type CashCollections = {
  total: string; cash: string; nonCash: string; cancelled: string; refunded: string;
  methods: { id: string; code: PaymentCode; name: string; amount: string; count: number; cancelled: string; refunded: string }[];
};
export type CashSession = {
  id: string; cashRegisterId: string; status: "OPEN" | "CLOSED"; openingAmount: string; liveExpectedAmount: string;
  expectedAmount: string | null; actualAmount: string | null; difference: string | null;
  openedAt: string; closedAt: string | null; movements: CashMovement[]; summary: Record<MovementType, string>;
  collections: CashCollections;
};
export type Payment = {
  id: string; amount: string; cashSessionId: string | null; paymentMethod: Pick<PaymentMethod, "id" | "name" | "code">;
  receivedAmount: string | null; changeAmount: string | null;
  billPartId: string | null; pendingAfter: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED"; reference: string | null; paidAt: string;
};
export type OrderPayments = { items: Payment[]; summary: { orderTotal: string; paid: string; pending: string } };
export type PaymentInput = { paymentMethodId: string; amount: number; receivedAmount?: number; reference?: string; notes?: string; cashSessionId: string; billPartId?: string; productSelection?: ProductSelection };
export type BillPartInput = { name?: string; items: { orderItemId: string; quantity: number }[] };
export type ProductSelection = BillPartInput & { expectedTotal: string };
export type BillPart = {
  id: string; name: string; total: string; paid: string; pending: string; removable: boolean;
  items: { orderItemId: string; name: string; variant: string | null; quantity: number; amount: string }[];
};
export type BillParts = {
  canSplit: boolean; unassignedAmount: string; parts: BillPart[];
  available: { id: string; name: string; variant: string | null; remainingQuantity: number; remainingAmount: string }[];
};
export type MovementInput = { type: ManualMovement; amount: number; description: string };
