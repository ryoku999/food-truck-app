import type { TableArea } from "./local.entity";

export const orderTypes = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;
export type OrderType = typeof orderTypes[number];
export type OrderStatus = "DRAFT" | "SENT" | "IN_PROGRESS" | "READY" | "SERVED" | "PAID" | "CANCELLED";
export type OrderItemStatus = "DRAFT" | "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
export interface OrderItem {
  id: string;
  productId: string | null;
  productVariantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes: string | null;
  status: OrderItemStatus;
  sentAt: string | null;
  roundNumber: number | null;
  cancellationReason: string | null;
  modifiers: { id: string; groupNameSnapshot: string; modifierOptionId: string | null; optionNameSnapshot: string; priceDelta: string; quantity: number }[];
  comboSelections: { id: string; comboGroupItemId: string | null; groupNameSnapshot: string; productNameSnapshot: string; additionalPrice: string }[];
}
export interface Order {
  id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  total: string;
  subtotal: string;
  discount: string;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdBy: { id: string; username: string } | null;
  tables: { id: string; name: string | null; number: number; diningArea: TableArea }[];
  items: OrderItem[];
  openedAt: string;
  sentAt: string | null;
}
export type OrderPage = { items: Order[]; meta: { page: number; pageSize: number; pageCount: number; total: number } };
export type OrderFilters = { createdById?: string; page: number; pageSize: number; status?: OrderStatus; search?: string; view?: "active" | "history"; from?: string; to?: string };
export type CreateOrder = { type: OrderType; tableIds: string[]; customerName?: string; customerPhone?: string; notes?: string };
export type OrderDetails = { customerName: string | null; customerPhone: string | null; notes: string | null };
export type AddOrderItem = { productId: string; productVariantId?: string; quantity: number; notes?: string; modifierOptionIds: string[]; comboSelections: { comboGroupId: string; comboGroupItemIds: string[] }[] };
export type DraftItemUpdate = { quantity: number; notes: string | null; productVariantId?: string | null; modifierOptionIds?: string[]; comboSelections?: AddOrderItem["comboSelections"] };
