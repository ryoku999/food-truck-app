import type {
  OrderItemStatus,
  OrderStatus,
  OrderType,
} from "@/core/entities/order.entity";

export const orderLabels: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};
export const itemLabels: Record<OrderItemStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  CANCELLED: "Cancelado",
};
export const typeLabels: Record<OrderType, string> = {
  DINE_IN: "En mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
};
export const moneyFormatter = (currency = "PEN") =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "PEN",
  });
