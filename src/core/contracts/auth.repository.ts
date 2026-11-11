import type { LoginReq, LoginRes, LogoutRes } from "../entities/auth.entity";

export interface AuthRepository {
  login: (dto: LoginReq) => Promise<LoginRes>;
  me: (signal?: AbortSignal) => Promise<LoginRes>;
  logout: () => Promise<LogoutRes>;
}
