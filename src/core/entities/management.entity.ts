import type { LoginRes } from "./auth.entity";

export type BusinessSettings = {
  name: string;
  tradeName: string | null;
  description: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencyCode: string;
};
export type Business = BusinessSettings & {
  id: string;
  logo: (Pick<StoredFile, "id" | "originalName" | "mimeType" | "size"> & { url: string }) | null;
  createdAt: string;
  updatedAt: string;
};
export type FileType = "LOGO" | "CATEGORY_IMAGE" | "PRODUCT_IMAGE" | "OTHER";
export interface StoredFile {
  id: string;
  type: FileType;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
}
export type FileUrl = { url: string; expiresInSeconds: number };
export type ManagedUser = LoginRes & { createdAt: string; updatedAt: string };
export type UserFields = Pick<LoginRes, "username" | "dni" | "lastName" | "userRole"> & { firstName: string };
export type NewUser = UserFields & { password: string };
export type UserFilters = { page: number; pageSize: number; search?: string; userRole?: LoginRes["userRole"]; status?: LoginRes["status"] };
export type UserPage = { items: ManagedUser[]; meta: { page: number; pageSize: number; total: number; pageCount: number } };
