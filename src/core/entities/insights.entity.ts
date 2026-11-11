export type DateRange = { from: string; to: string };
export type Totals = {
  collected: string;
  cancelled: string;
  refunded: string;
  paymentCount: number;
  orderCount: number;
};
export type Dashboard = Totals & {
  cancelledOrders: number;
  openOrders: number;
};
export type Sales = {
  groupBy: "day" | "month";
  items: (Totals & { period: string })[];
  totals: Totals;
};
export type ProductSales = {
  items: {
    productId: string | null;
    name: string;
    quantity: number;
    subtotal: string;
  }[];
};
export type WaiterSales = {
  items: (Totals & { userId: string | null; username: string | null })[];
};
export type MethodSales = {
  items: (Totals & { id: string; code: string; name: string })[];
  totals: Totals;
};
export type CashClosures = {
  items: {
    id: string;
    openedAt: string;
    closedAt: string;
    openingAmount: string;
    expectedAmount: string | null;
    actualAmount: string | null;
    difference: string | null;
    cashRegister: { id: string; name: string };
  }[];
};
export interface ReportResults {
  dashboard: Dashboard;
  sales: Sales;
  products: ProductSales;
  waiters: WaiterSales;
  "payment-methods": MethodSales;
  "cash-sessions": CashClosures;
}
export interface ReportParams {
  dashboard: DateRange;
  sales: DateRange & { groupBy: "day" | "month" };
  products: DateRange & { limit: number };
  waiters: DateRange;
  "payment-methods": DateRange;
  "cash-sessions": DateRange & { cashRegisterId?: string };
}

export const auditActions = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "CANCEL",
  "LOGIN",
  "LOGOUT",
  "PAYMENT",
  "PRINT",
  "OPEN_CASH",
  "CLOSE_CASH",
] as const;
export type AuditAction = (typeof auditActions)[number];
export type AuditFilters = Partial<DateRange> & {
  action?: AuditAction;
  userId?: string;
  entity?: string;
  entityId?: string;
  offset: number;
  limit: number;
};
export type AuditEntry = {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  description: string | null;
  userId: string | null;
  user: { id: string; username: string } | null;
  createdAt: string;
};
export type AuditPage = {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
};
export type AuditDetail = AuditEntry & {
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
};
