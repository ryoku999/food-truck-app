import type { PrintingRepository } from "@/core/contracts/printing.repository";
import {
  printInProgress,
  type PrintJobFilters,
} from "@/core/entities/printing.entity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { printingService } from "../services/printing.service";

const config = ["printing-config"] as const;
const jobs = ["print-jobs"] as const;
export const usePrinters = (enabled = true) =>
  useQuery({
    queryKey: [...config, "printers"],
    queryFn: ({ signal }) => printingService.printers(signal),
    enabled,
    retry: false,
  });
export const usePrinterAgents = () =>
  useQuery({
    queryKey: [...config, "agents"],
    queryFn: ({ signal }) => printingService.agents(signal),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
export const usePrintJobs = (params: PrintJobFilters) =>
  useQuery({
    queryKey: [...jobs, "list", params],
    queryFn: ({ signal }) => printingService.jobs(params, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.items.some(printInProgress) ? 4000 : 20000,
  });
export const usePrintJob = (id: string) =>
  useQuery({
    queryKey: [...jobs, "detail", id],
    queryFn: ({ signal }) => printingService.job(id, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && printInProgress(query.state.data) ? 4000 : false,
  });
export function usePrintAction<T>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: (repo: PrintingRepository) => Promise<T>) =>
      action(printingService),
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: jobs }),
        client.invalidateQueries({ queryKey: config }),
      ]),
  });
}
