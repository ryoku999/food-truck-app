import type {
  OrderItemStatus,
  OrderStatus,
  OrderType,
} from "@/core/entities/order.entity";

export const orderLabels: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  IN_PROGRESS: "En preparación",
  READY: "Listo",
  SERVED: "Entregado",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};
export const itemLabels: Record<OrderItemStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Entregado",
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
