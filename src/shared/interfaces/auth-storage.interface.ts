import type { LoginRes } from "@/core/entities/auth.entity";

export interface AuthStore {
  user: LoginRes | null;
  setUser: (user: LoginRes) => void;
  clearSession: () => void;
}
