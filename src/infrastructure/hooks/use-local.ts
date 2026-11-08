import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DiningFields,
  ProductionFields,
  TableFields,
  TableStatus,
} from "@/core/entities/local.entity";
import { localService } from "../services/local.service";

const root = ["local"] as const;

export const useProductionAreas = () =>
  useQuery({
    queryKey: [...root, "production"],
    queryFn: ({ signal }) => localService.production(signal),
  });

export const useDiningAreas = () =>
  useQuery({
    queryKey: [...root, "dining"],
    queryFn: ({ signal }) => localService.dining(signal),
  });

export const useLocalTables = () =>
  useQuery({
    queryKey: [...root, "tables"],
    queryFn: ({ signal }) => localService.tables(signal),
  });

export const useTableMap = (area: string | undefined, inactive: boolean) =>
  useQuery({
    queryKey: [...root, "map", area, inactive],
    queryFn: ({ signal }) => localService.map(area, inactive, signal),
    staleTime: 0,
    refetchInterval: 15_000,
  });
export function useLocalActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: root });
  return {
    production: useMutation({
      mutationFn: ({ fields, id }: { fields: ProductionFields; id?: string }) =>
        localService.saveProduction(fields, id),
      onSuccess: refresh,
    }),
    dining: useMutation({
      mutationFn: ({ fields, id }: { fields: DiningFields; id?: string }) =>
        localService.saveDining(fields, id),
      onSuccess: refresh,
    }),
    table: useMutation({
      mutationFn: ({ fields, id }: { fields: TableFields; id?: string }) =>
        localService.saveTable(fields, id),
      onSuccess: refresh,
    }),
    active: useMutation({
      mutationFn: ({
        kind,
        id,
        active,
      }: {
        kind: "production-areas" | "dining-areas";
        id: string;
        active: boolean;
      }) => localService.areaActive(kind, id, active),
      onSuccess: refresh,
    }),
    status: useMutation({
      mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
        localService.tableStatus(id, status),
      onSuccess: refresh,
    }),
  };
}
