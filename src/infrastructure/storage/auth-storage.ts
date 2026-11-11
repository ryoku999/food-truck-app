import type { AuthStore } from "@/shared/interfaces/auth-storage.interface";
import { create } from "zustand";

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null }),
}));
