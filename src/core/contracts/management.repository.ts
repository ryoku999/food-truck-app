import type { Business, BusinessSettings, FileType, FileUrl, ManagedUser, NewUser, StoredFile, UserFields, UserFilters, UserPage } from "../entities/management.entity";

export interface BusinessRepository {
  get(signal?: AbortSignal): Promise<Business>;
  save(settings: BusinessSettings): Promise<Business>;
  setLogo(fileId: string): Promise<Business>;
  removeLogo(): Promise<Business>;
}
export interface FilesRepository {
  upload(file: File, type: FileType): Promise<StoredFile>;
  url(id: string, signal?: AbortSignal): Promise<FileUrl>;
}
export interface UsersRepository {
  list(filters: UserFilters, signal?: AbortSignal): Promise<UserPage>;
  get(id: string, signal?: AbortSignal): Promise<ManagedUser>;
  create(input: NewUser): Promise<ManagedUser>;
  update(id: string, input: UserFields): Promise<ManagedUser>;
  status(id: string, status: ManagedUser["status"]): Promise<ManagedUser>;
  password(id: string, password: string): Promise<{ message: string }>;
}
