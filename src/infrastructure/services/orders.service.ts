import http from "@/config/http/axios";
import type { OrdersRepository } from "@/core/contracts/orders.repository";
import type {
  AddOrderItem,
  CreateOrder,
  DraftItemUpdate,
  Order,
  OrderDetails,
  OrderFilters,
  OrderPage,
} from "@/core/entities/order.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class OrdersService implements OrdersRepository {
  async list(params: OrderFilters, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<OrderPage>>("/orders", { params, signal })
    ).data.data;
  }
  async get(id: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order>>(`/orders/${id}`, { signal }))
      .data.data;
  }
  async create(input: CreateOrder) {
    return (await http.post<ApiEnvelope<Order>>("/orders", input)).data.data;
  }
  async update(id: string, input: OrderDetails) {
    return (await http.patch<ApiEnvelope<Order>>(`/orders/${id}`, input)).data
      .data;
  }
  async setTables(id: string, tableIds: string[]) {
    return (
      await http.post<ApiEnvelope<Order>>(`/orders/${id}/tables`, { tableIds })
    ).data.data;
  }
  async addItem(id: string, input: AddOrderItem) {
    return (await http.post<ApiEnvelope<Order>>(`/orders/${id}/items`, input))
      .data.data;
  }
  async updateItem(id: string, itemId: string, input: DraftItemUpdate) {
    return (
      await http.patch<ApiEnvelope<Order>>(
        `/orders/${id}/items/${itemId}`,
        input,
      )
    ).data.data;
  }
  async removeItem(id: string, itemId: string) {
    return (
      await http.delete<ApiEnvelope<Order>>(`/orders/${id}/items/${itemId}`)
    ).data.data;
  }
  async cancelItem(
    id: string,
    itemId: string,
    reason: string,
    quantity?: number,
  ) {
    return (
      await http.post<ApiEnvelope<Order>>(
        `/orders/${id}/items/${itemId}/cancel`,
        { reason, quantity },
      )
    ).data.data;
  }
  async cancel(id: string, reason: string) {
    return (
      await http.post<ApiEnvelope<Order>>(`/orders/${id}/cancel`, { reason })
    ).data.data;
  }
  async send(id: string) {
    return (await http.post<ApiEnvelope<Order>>(`/orders/${id}/send`, {})).data
      .data;
  }
}
export const ordersService = new OrdersService();
