import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductFilters } from "@/core/entities/catalog.entity";
import { catalogService } from "../services/catalog.service";

const key = ["catalog"] as const;
export const useCategories = () =>
  useQuery({
    queryKey: [...key, "categories"],
    queryFn: ({ signal }) => catalogService.categories(signal),
  });
export const useCatalogModifiers = () =>
  useQuery({
    queryKey: [...key, "modifiers"],
    queryFn: ({ signal }) => catalogService.modifiers(signal),
  });
export const useCatalogProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: [...key, "products", filters],
    queryFn: ({ signal }) => catalogService.products(filters, signal),
  });
export const useCatalogProduct = (id?: string) =>
  useQuery({
    queryKey: [...key, "product", id],
    queryFn: ({ signal }) => catalogService.product(id!, signal),
    enabled: !!id,
  });
export const useMenu = () =>
  useQuery({
    queryKey: [...key, "menu"],
    queryFn: ({ signal }) => catalogService.menu(signal),
  });
export function useCatalogActions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: (service: typeof catalogService) => Promise<void>) =>
      action(catalogService),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
