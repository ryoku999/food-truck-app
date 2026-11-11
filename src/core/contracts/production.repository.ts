import type {
  PreparationChange,
  ProductionArea,
  ProductionFilters,
  ProductionItem,
  ProductionPage,
} from "../entities/production.entity";

export interface ProductionRepository {
  list(
    area: ProductionArea,
    filters: ProductionFilters,
    signal?: AbortSignal,
  ): Promise<ProductionPage>;
  update(
    area: ProductionArea,
    id: string,
    change: PreparationChange,
  ): Promise<ProductionItem>;
}
