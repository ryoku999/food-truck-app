import queryClient from "../query/tanstack-query";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";

export const endSession = (): void => {
  useAuthStore.getState().clearSession();
  queryClient.clear();
};
