import type {
  PreparationChange,
  ProductionArea,
  ProductionFilters,
} from "@/core/entities/production.entity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productionService } from "../services/production.service";

export function useProductionQueue(
  area: ProductionArea,
  filters: ProductionFilters,
  connected: boolean,
) {
  return useQuery({
    queryKey: ["production", area, filters],
    queryFn: ({ signal }) => productionService.list(area, filters, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: connected ? 60_000 : 15_000,
    retry: false,
  });
}

export function usePreparationChange(area: ProductionArea) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: PreparationChange }) =>
      productionService.update(area, id, change),
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["production", area] }),
        client.invalidateQueries({ queryKey: ["orders"] }),
        client.invalidateQueries({ queryKey: ["local", "map"] }),
      ]),
  });
}
