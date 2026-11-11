import type { AddOrderItem, CreateOrder, DraftItemUpdate, Order, OrderDetails, OrderFilters, OrderPage } from "../entities/order.entity";

export interface OrdersRepository {
  list(params: OrderFilters, signal?: AbortSignal): Promise<OrderPage>;
  get(id: string, signal?: AbortSignal): Promise<Order>;
  create(input: CreateOrder): Promise<Order>;
  update(id: string, input: OrderDetails): Promise<Order>;
  setTables(id: string, tableIds: string[]): Promise<Order>;
  addItem(id: string, input: AddOrderItem): Promise<Order>;
  updateItem(id: string, itemId: string, input: DraftItemUpdate): Promise<Order>;
  removeItem(id: string, itemId: string): Promise<Order>;
  send(id: string): Promise<Order>;
  cancel(id: string, reason: string): Promise<Order>;
  cancelItem(id: string, itemId: string, reason: string, quantity?: number): Promise<Order>;
}
