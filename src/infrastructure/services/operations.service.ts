import { io } from "socket.io-client";

export type OperationsState = "connecting" | "online" | "offline";
export const operationEvents = [
  "order.sent",
  "kitchen.item.created",
  "bar.item.created",
  "order-item.status.changed",
  "order.status.changed",
  "table.status.changed",
  "print-job.status.changed",
] as const;
export type OperationEvent = (typeof operationEvents)[number];

export function createOperationsSocket() {
  const rest = import.meta.env.VITE_API_URL || "/api";
  const origin = new URL(rest, window.location.origin).origin;
  return io(`${origin}/operations`, {
    withCredentials: true,
    autoConnect: false,
  });
}
