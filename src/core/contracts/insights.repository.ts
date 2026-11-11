import type {
  AuditDetail,
  AuditFilters,
  AuditPage,
  ReportParams,
  ReportResults,
} from "../entities/insights.entity";

export interface InsightsRepository {
  report<K extends keyof ReportResults>(
    report: K,
    params: ReportParams[K],
    signal?: AbortSignal,
  ): Promise<ReportResults[K]>;
  audit(filters: AuditFilters, signal?: AbortSignal): Promise<AuditPage>;
  auditDetail(id: string, signal?: AbortSignal): Promise<AuditDetail>;
}
