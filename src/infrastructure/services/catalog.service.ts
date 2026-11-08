import http from "@/config/http/axios";
import type { CatalogRepository } from "@/core/contracts/catalog.repository";
import type { Category, Menu, ModifierGroup, Product, ProductFilters, ProductPage, CatalogFields, CatalogEditResource } from "@/core/entities/catalog.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

const nestedCreate = {
  "modifier-options": (id: string) => `/modifier-groups/${id}/options`,
  "product-variants": (id: string) => `/products/${id}/variants`,
  "combo-groups": (id: string) => `/products/${id}/combo-groups`,
  "combo-group-items": (id: string) => `/combo-groups/${id}/items`,
};

class CatalogService implements CatalogRepository {
  private async get<T>(path: string, signal?: AbortSignal, params?: ProductFilters) {
    return (await http.get<ApiEnvelope<T>>(path, { signal, params })).data.data;
  }
  categories(signal?: AbortSignal) { return this.get<Category[]>("/categories", signal); }
  products(filters: ProductFilters, signal?: AbortSignal) { return this.get<ProductPage>("/products", signal, filters); }
  product(id: string, signal?: AbortSignal) { return this.get<Product>(`/products/${id}`, signal); }
  menu(signal?: AbortSignal) { return this.get<Menu>("/products/menu", signal); }
  modifiers(signal?: AbortSignal) { return this.get<ModifierGroup[]>("/modifier-groups", signal); }
  async save(resource: CatalogEditResource, fields: CatalogFields, id?: string, parentId?: string) {
    if (id) {
      await http.patch(`/${resource}/${id}`, fields);
      return;
    }
    if (resource === "categories" || resource === "products" || resource === "modifier-groups") {
      await http.post(`/${resource}`, fields);
      return;
    }
    if (!parentId) throw new Error("Falta el recurso padre");
    await http.post(nestedCreate[resource](parentId), fields);
  }
  async flag(resource: CatalogEditResource, id: string, key: "active" | "available", value: boolean) {
    const suffix = resource === "modifier-options" || key === "active" ? "status" : "availability";
    await http.patch(`/${resource}/${id}/${suffix}`, { [key]: value });
  }
  async image(resource: "categories" | "products", id: string, fileId: string, action: "attach" | "update" | "remove", fields?: CatalogFields) {
    const path = `/${resource}/${id}/images`;
    if (action === "attach") await http.post(path, { ...fields, fileId });
    else if (action === "update") await http.patch(`${path}/${fileId}`, fields);
    else await http.delete(`${path}/${fileId}`);
  }
  async assign(productId: string, groupIds: string[]) {
    await http.put(`/products/${productId}/modifier-groups`, { groups: groupIds.map((modifierGroupId, sortOrder) => ({ modifierGroupId, sortOrder })) });
  }
  async removeComboItem(id: string) { await http.delete(`/combo-group-items/${id}`); }
}
export const catalogService = new CatalogService();
