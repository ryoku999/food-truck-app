import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../storage/auth-storage";
import { authService } from "../services/auth.service";
import {
  createOperationsSocket,
  operationEvents,
  type OperationsState,
} from "../services/operations.service";

export const OperationsContext = createContext<OperationsState>("offline");
export const useOperationsState = () => useContext(OperationsContext);

export function useOperationsConnection(notify: () => void): OperationsState {
  const userId = useAuthStore((state) => state.user?.id);
  const role = useAuthStore((state) => state.user?.userRole);
  const client = useQueryClient();
  const [state, setState] = useState<OperationsState>("connecting");

  useEffect(() => {
    if (!userId) return;
    const socket = createOperationsSocket();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let recovery: ReturnType<typeof setTimeout> | undefined;
    const queued = new Map<string, string[]>();
    const heard = new Set<string>();
    const alertOnce = (id: string) => {
      if (heard.has(id)) return;
      heard.add(id);
      if (heard.size > 256) {
        const oldest = heard.values().next().value;
        if (oldest) heard.delete(oldest);
      }
      notify();
    };
    const queue = (...key: string[]) => {
      queued.set(key.join(":"), key);
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        for (const queryKey of queued.values())
          void client.invalidateQueries({ queryKey });
        queued.clear();
      }, 150);
    };
    const all = () => {
      queue("production");
      queue("orders");
      queue("local", "map");
      queue("print-jobs");
      queue("cashier");
    };
    socket.on("operations.ready", () => {
      setState("online");
      all();
    });
    socket.on("connect_error", () => setState("offline"));
    socket.on("production.batch.received", ({ data }: { data: { id: string; area: string } }) => {
      if (role === data.area && (role === "KITCHEN" || role === "BAR")) {
        alertOnce(`batch:${data.id}`);
      }
    });
    socket.on("waiter.item.ready", ({ data }: { data: { id: string } }) => {
      if (role === "WAITER") {
        queue("orders", "ready-for-service");
        alertOnce(`ready:${data.id}`);
      }
    });
    socket.on("disconnect", (reason) => {
      setState("offline");
      if (reason !== "io server disconnect" || controller.signal.aborted)
        return;
      // Server disconnects do not auto-reconnect. Validate/refresh via REST first.
      recovery = setTimeout(() => {
        void authService
          .me(controller.signal)
          .then(() => {
            if (!controller.signal.aborted) socket.connect();
          })
          .catch(() => undefined);
      }, 15_000);
    });
    for (const event of operationEvents) {
      socket.on(event, () => {
        if (event === "kitchen.item.created") queue("production", "kitchen");
        else if (event === "bar.item.created") queue("production", "bar");
        else if (event === "print-job.status.changed") queue("print-jobs");
        else if (event === "table.status.changed") queue("local", "map");
        else {
          queue("orders");
          queue("local", "map");
          if (event === "order.status.changed" || event === "order.sent")
            queue("cashier", "payments");
          if (event === "order-item.status.changed") queue("production");
        }
      });
    }
    socket.connect();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(recovery);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [client, userId, role, notify]);

  return userId ? state : "offline";
}
