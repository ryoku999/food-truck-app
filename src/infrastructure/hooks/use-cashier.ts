import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CashierRepository } from "@/core/contracts/cashier.repository";
import { cashierService } from "../services/cashier.service";

const root = ["cashier"] as const;
export const usePaymentMethods = () =>
  useQuery({
    queryKey: [...root, "methods"],
    queryFn: ({ signal }) => cashierService.methods(signal),
    retry: false,
  });
export const useCashRegisters = () =>
  useQuery({
    queryKey: [...root, "registers"],
    queryFn: ({ signal }) => cashierService.registers(signal),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
export const useCashSession = (id?: string) =>
  useQuery({
    queryKey: [...root, "session", id],
    queryFn: ({ signal }) => cashierService.session(id!, signal),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
export const useOrderPayments = (id: string) =>
  useQuery({
    queryKey: [...root, "payments", id],
    queryFn: ({ signal }) => cashierService.payments(id, signal),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
export const useBillParts = (id: string) =>
  useQuery({
    queryKey: [...root, "payments", id, "parts"],
    queryFn: ({ signal }) => cashierService.billParts(id, signal),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });

export function useCashierAction<T>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: (repo: CashierRepository) => Promise<T>) =>
      action(cashierService),
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: root }),
        client.invalidateQueries({ queryKey: ["orders"] }),
        client.invalidateQueries({ queryKey: ["local", "map"] }),
      ]),
  });
}
