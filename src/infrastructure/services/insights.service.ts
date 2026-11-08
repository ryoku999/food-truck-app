import http from "@/config/http/axios";
import type { InsightsRepository } from "@/core/contracts/insights.repository";
import type { AuditDetail, AuditFilters, AuditPage, ReportParams, ReportResults } from "@/core/entities/insights.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class InsightsService implements InsightsRepository {
  private async get<T>(path: string, params?: object, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<T>>(path, { params, signal })).data.data;
  }
  report<K extends keyof ReportResults>(report: K, params: ReportParams[K], signal?: AbortSignal) {
    return this.get<ReportResults[K]>(`/reports/${report}`, params, signal);
  }
  audit(filters: AuditFilters, signal?: AbortSignal) { return this.get<AuditPage>("/audit-logs", filters, signal); }
  auditDetail(id: string, signal?: AbortSignal) { return this.get<AuditDetail>(`/audit-logs/${id}`, undefined, signal); }
}
export const insightsService = new InsightsService();
