import http from "@/config/http/axios";
import type { ProductionRepository } from "@/core/contracts/production.repository";
import type {
  PreparationChange,
  ProductionArea,
  ProductionFilters,
  ProductionItem,
  ProductionPage,
} from "@/core/entities/production.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class ProductionService implements ProductionRepository {
  async list(
    area: ProductionArea,
    params: ProductionFilters,
    signal?: AbortSignal,
  ) {
    return (
      await http.get<ApiEnvelope<ProductionPage>>(`/${area}/items`, {
        params,
        signal,
      })
    ).data.data;
  }
  async update(area: ProductionArea, id: string, change: PreparationChange) {
    return (
      await http.patch<ApiEnvelope<ProductionItem>>(
        `/${area}/items/${id}/status`,
        change,
      )
    ).data.data;
  }
}
export const productionService = new ProductionService();
