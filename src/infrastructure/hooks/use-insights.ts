import { useQuery } from "@tanstack/react-query";
import type {
  AuditFilters,
  ReportParams,
  ReportResults,
} from "@/core/entities/insights.entity";
import { insightsService } from "../services/insights.service";

export function useReport<K extends keyof ReportResults>(
  report: K,
  params: ReportParams[K],
) {
  return useQuery({
    queryKey: ["reports", report, params],
    queryFn: ({ signal }) => insightsService.report(report, params, signal),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });
}
export const useAuditLogs = (filters: AuditFilters) =>
  useQuery({
    queryKey: ["audit-logs", "list", filters],
    queryFn: ({ signal }) => insightsService.audit(filters, signal),
    staleTime: 0,
    retry: false,
  });
export const useAuditDetail = (id?: string) =>
  useQuery({
    queryKey: ["audit-logs", "detail", id],
    queryFn: ({ signal }) => insightsService.auditDetail(id!, signal),
    enabled: !!id,
    retry: false,
  });
