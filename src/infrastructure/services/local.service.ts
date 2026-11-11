import http from "@/config/http/axios";
import type { LocalRepository } from "@/core/contracts/local.repository";
import type {
  DiningArea,
  DiningFields,
  LocalTable,
  ProductionArea,
  ProductionFields,
  TableFields,
  TableMap,
  TableStatus,
} from "@/core/entities/local.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class LocalService implements LocalRepository {
  async production(signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<ProductionArea[]>>("/production-areas", {
        signal,
      })
    ).data.data;
  }
  async dining(signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<DiningArea[]>>("/dining-areas", { signal })
    ).data.data;
  }
  async tables(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<LocalTable[]>>("/tables", { signal }))
      .data.data;
  }
  async map(
    diningAreaId: string | undefined,
    includeInactive: boolean,
    signal?: AbortSignal,
  ) {
    return (
      await http.get<ApiEnvelope<TableMap>>("/tables/map", {
        params: { diningAreaId, includeInactive },
        signal,
      })
    ).data.data;
  }
  private async save<T>(path: string, fields: object, id?: string) {
    const response = id
      ? await http.patch<ApiEnvelope<T>>(`${path}/${id}`, fields)
      : await http.post<ApiEnvelope<T>>(path, fields);
    return response.data.data;
  }
  saveProduction(fields: ProductionFields, id?: string) {
    return this.save<ProductionArea>("/production-areas", fields, id);
  }
  saveDining(fields: DiningFields, id?: string) {
    return this.save<DiningArea>("/dining-areas", fields, id);
  }
  saveTable(fields: TableFields, id?: string) {
    return this.save<LocalTable>("/tables", fields, id);
  }
  async areaActive(
    kind: "production-areas" | "dining-areas",
    id: string,
    active: boolean,
  ) {
    await http.patch(`/${kind}/${id}/status`, { active });
  }
  async tableStatus(id: string, status: TableStatus) {
    await http.patch(`/tables/${id}/status`, { status });
  }
}
export const localService = new LocalService();
