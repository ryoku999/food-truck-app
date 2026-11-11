import type {
  DiningArea,
  DiningFields,
  LocalTable,
  ProductionArea,
  ProductionFields,
  TableFields,
  TableMap,
  TableStatus,
} from "../entities/local.entity";

export interface LocalRepository {
  production(signal?: AbortSignal): Promise<ProductionArea[]>;
  dining(signal?: AbortSignal): Promise<DiningArea[]>;
  tables(signal?: AbortSignal): Promise<LocalTable[]>;
  map(
    area: string | undefined,
    includeInactive: boolean,
    signal?: AbortSignal,
  ): Promise<TableMap>;
  saveProduction(
    fields: ProductionFields,
    id?: string,
  ): Promise<ProductionArea>;
  saveDining(fields: DiningFields, id?: string): Promise<DiningArea>;
  saveTable(fields: TableFields, id?: string): Promise<LocalTable>;
  areaActive(
    kind: "production-areas" | "dining-areas",
    id: string,
    active: boolean,
  ): Promise<void>;
  tableStatus(id: string, status: TableStatus): Promise<void>;
}
