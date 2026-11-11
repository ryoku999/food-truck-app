import type { OrderItemStatus, OrderStatus } from "./order.entity";

export type ProductionArea = "kitchen" | "bar";
export type BoardStatus = "PENDING" | "PREPARING" | "READY";
export type PreparationChange =
  | { status: "PREPARING" | "READY" | "SERVED" }
  | { status: "CANCELLED"; cancellationReason: string };
export interface ProductionItem {
  id: string;
  orderId: string;
  orderNumber: number;
  orderStatus: OrderStatus;
  tables: {
    id: string;
    number: number;
    name: string | null;
    diningAreaName: string;
  }[];
  quantity: number;
  productName: string;
  variantName: string | null;
  modifiers: { groupName: string; optionName: string; quantity: number }[];
  comboSelections: { groupName: string; productName: string }[];
  notes: string | null;
  status: OrderItemStatus;
  sentAt: string | null;
  roundNumber: number | null;
  createdAt: string;
  elapsedSeconds: number;
}
export type ProductionPage = {
  items: ProductionItem[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};
export type ProductionFilters = {
  status: BoardStatus;
  page: number;
  pageSize: number;
  search?: string;
};
