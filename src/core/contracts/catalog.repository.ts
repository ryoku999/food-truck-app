import type {
  Category,
  Menu,
  ModifierGroup,
  Product,
  ProductFilters,
  ProductPage,
  CatalogFields,
  CatalogEditResource,
} from "../entities/catalog.entity";

export interface CatalogRepository {
  categories(signal?: AbortSignal): Promise<Category[]>;
  products(filters: ProductFilters, signal?: AbortSignal): Promise<ProductPage>;
  product(id: string, signal?: AbortSignal): Promise<Product>;
  menu(signal?: AbortSignal): Promise<Menu>;
  modifiers(signal?: AbortSignal): Promise<ModifierGroup[]>;
  save(
    resource: CatalogEditResource,
    fields: CatalogFields,
    id?: string,
    parentId?: string,
  ): Promise<void>;
  flag(
    resource: CatalogEditResource,
    id: string,
    key: "active" | "available",
    value: boolean,
  ): Promise<void>;
  image(
    resource: "categories" | "products",
    id: string,
    fileId: string,
    action: "attach" | "update" | "remove",
    fields?: CatalogFields,
  ): Promise<void>;
  assign(productId: string, groupIds: string[]): Promise<void>;
  removeComboItem(id: string): Promise<void>;
}
