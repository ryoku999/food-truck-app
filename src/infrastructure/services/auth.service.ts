import http from "@/config/http/axios";
import type { AuthRepository } from "@/core/contracts/auth.repository";
import type {
  LoginReq,
  LoginRes,
  LogoutRes,
} from "@/core/entities/auth.entity";
import type { ApiEnvelope } from "@/shared/interfaces/api-response.interface";
import type { AxiosInstance } from "axios";

class AuthService implements AuthRepository {
  private readonly http: AxiosInstance = http;
  private readonly prefix = "/auth";

  async me(signal?: AbortSignal): Promise<LoginRes> {
    const { data } = await this.http.get<ApiEnvelope<LoginRes>>(
      `${this.prefix}/me`,
      { signal },
    );
    return data.data;
  }

  async login(dto: LoginReq): Promise<LoginRes> {
    const { data } = await this.http.post<ApiEnvelope<LoginRes>>(
      `${this.prefix}/login`,
      dto,
    );
    return data.data;
  }

  async logout(): Promise<LogoutRes> {
    const { data } = await this.http.post<ApiEnvelope<LogoutRes>>(
      `${this.prefix}/logout`,
    );
    return data.data;
  }
}

export const authService = new AuthService();
