import http from "@/config/http/axios";
import type { BusinessRepository, FilesRepository, UsersRepository } from "@/core/contracts/management.repository";
import type { Business, BusinessSettings, FileType, FileUrl, ManagedUser, NewUser, StoredFile, UserFields, UserFilters, UserPage } from "@/core/entities/management.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";

class BusinessService implements BusinessRepository {
  async get(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Business>>("/business", { signal })).data.data;
  }
  async save(settings: BusinessSettings) {
    return (await http.put<ApiEnvelope<Business>>("/business", settings)).data.data;
  }
  async setLogo(fileId: string) {
    return (await http.put<ApiEnvelope<Business>>("/business/logo", { fileId })).data.data;
  }
  async removeLogo() {
    return (await http.delete<ApiEnvelope<Business>>("/business/logo")).data.data;
  }
}
class FilesService implements FilesRepository {
  async upload(file: File, type: FileType) {
    const data = new FormData();
    data.append("type", type);
    data.append("file", file);
    return (await http.post<ApiEnvelope<StoredFile>>("/files/images", data)).data.data;
  }
  async url(id: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<FileUrl>>(`/files/${id}/url`, { signal })).data.data;
  }
}
class UsersService implements UsersRepository {
  async list(params: UserFilters, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<UserPage>>("/users", { params, signal })).data.data;
  }
  async get(id: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<ManagedUser>>(`/users/${id}`, { signal })).data.data;
  }
  async create(input: NewUser) {
    return (await http.post<ApiEnvelope<ManagedUser>>("/users", input)).data.data;
  }
  async update(id: string, input: UserFields) {
    return (await http.patch<ApiEnvelope<ManagedUser>>(`/users/${id}`, input)).data.data;
  }
  async status(id: string, status: ManagedUser["status"]) {
    return (await http.patch<ApiEnvelope<ManagedUser>>(`/users/${id}/status`, { status })).data.data;
  }
  async password(id: string, password: string) {
    return (await http.patch<ApiEnvelope<{ message: string }>>(`/users/${id}/password`, { password })).data.data;
  }
}
export const businessService = new BusinessService();
export const filesService = new FilesService();
export const usersService = new UsersService();
