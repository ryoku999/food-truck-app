import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { BusinessSettings, ManagedUser, NewUser, UserFields, UserFilters } from "@/core/entities/management.entity";
import { businessService, filesService, usersService } from "../services/management.service";

const businessKey = ["business"] as const;
const usersKey = ["users"] as const;

export function useBusiness() {
  return useQuery({
    queryKey: businessKey,
    queryFn: ({ signal }) => businessService.get(signal).catch((error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }),
    retry: false,
  });
}
export function useBusinessActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: businessKey });
  const settings = useMutation({ mutationFn: (data: BusinessSettings) => businessService.save(data), onSuccess: refresh });
  const upload = useMutation({ mutationFn: (file: File) => filesService.upload(file, "LOGO") });
  const logo = useMutation({ mutationFn: (id: string | null) => id ? businessService.setLogo(id) : businessService.removeLogo(), onSuccess: refresh });
  return { settings, upload, logo };
}
export function useSignedImage(id: string) {
  return useQuery({ queryKey: ["file-url", id], queryFn: ({ signal }) => filesService.url(id, signal), retry: false, staleTime: 0 });
}
export function useUsers(filters: UserFilters) {
  return useQuery({ queryKey: [...usersKey, "list", filters], queryFn: ({ signal }) => usersService.list(filters, signal), retry: false });
}
export function useUser(id?: string) {
  return useQuery({ queryKey: [...usersKey, "detail", id], queryFn: ({ signal }) => usersService.get(id!, signal), enabled: !!id, retry: false });
}
export function useUserActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: usersKey });
  const create = useMutation({ mutationFn: (input: NewUser) => usersService.create(input), onSuccess: refresh, gcTime: 0 });
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: UserFields }) => usersService.update(id, input), onSuccess: refresh });
  const status = useMutation({ mutationFn: ({ id, status }: { id: string; status: ManagedUser["status"] }) => usersService.status(id, status), onSuccess: refresh });
  const password = useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => usersService.password(id, password), gcTime: 0 });
  return { create, update, status, password };
}
