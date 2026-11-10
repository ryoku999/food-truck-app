import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrdersRepository } from "@/core/contracts/orders.repository";
import type { Order, OrderFilters } from "@/core/entities/order.entity";
import { ordersService } from "../services/orders.service";

import { useAuthStore } from "../storage/auth-storage";

const orderKey = (id: string) => ["orders", "detail", id] as const;
export const useOrder = (id: string) => useQuery({
  queryKey: orderKey(id), queryFn: ({ signal }) => ordersService.get(id, signal),
  staleTime: 0, refetchInterval: 15_000, retry: false,
});
export function useOrders(params: OrderFilters, enabled = true) {
  const userId = useAuthStore(store => store.user?.id);
  return useQuery({
    queryKey: ["orders", "list", userId, params],
    queryFn: ({ signal }) => ordersService.list(params, signal),
    enabled: enabled && Boolean(userId),
    staleTime: 0, retry: false,
  });
}
export function useOrderAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: (repository: OrdersRepository) => Promise<Order>) => action(ordersService),
    retry: false,
    onSuccess: async order => {
      await client.cancelQueries({ queryKey: orderKey(order.id) });
      client.setQueryData(orderKey(order.id), order);
      void client.invalidateQueries({ queryKey: ["orders", "list"] });
      void client.invalidateQueries({ queryKey: ["local", "map"] });
    },
  });
}
