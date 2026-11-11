import {
  AxiosError,
  create,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { endSession } from "./auth-session";

const baseURL = import.meta.env.VITE_API_URL || "/api";
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/refresh", "/auth/logout"];

const http: AxiosInstance = create({
  baseURL,
  withCredentials: true,
});

const refreshApi: AxiosInstance = create({
  baseURL,
  timeout: 30_000,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

interface AuthErrorResponse {
  code:
    "ACCESS_TOKEN_EXPIRED" | "ACCESS_TOKEN_MISSING" | "ACCESS_TOKEN_INVALID";
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const isAuthErrorResponse = (data: unknown): data is AuthErrorResponse => {
  if (!data || typeof data !== "object") return false;

  const { code } = data as Record<string, unknown>;
  return (
    code === "ACCESS_TOKEN_EXPIRED" ||
    code === "ACCESS_TOKEN_MISSING" ||
    code === "ACCESS_TOKEN_INVALID"
  );
};

const isPublicAuthRoute = (url: string | undefined) => {
  const pathname = url?.split("?")[0];
  return PUBLIC_AUTH_ROUTES.includes(pathname ?? "");
};

http.interceptors.response.use(
  (res) => {
    return res;
  },
  async (error: AxiosError) => {
    const req = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status !== 401 || !req || isPublicAuthRoute(req.url)) {
      return Promise.reject(error);
    }

    if (
      isAuthErrorResponse(error.response.data) &&
      error.response.data.code === "ACCESS_TOKEN_INVALID"
    ) {
      endSession();
      return Promise.reject(error);
    }

    if (req._retry) {
      endSession();
      return Promise.reject(error);
    }

    req._retry = true;

    try {
      await refreshAccessToken();
      return http(req);
    } catch (refreshError) {
      if (
        refreshError instanceof AxiosError &&
        refreshError.response?.status === 401
      ) {
        endSession();
      }
      return Promise.reject(refreshError);
    }
  },
);

export default http;
