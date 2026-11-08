import { isAxiosError } from "axios";

export function apiError(error: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return fallback;
  const message = error.response?.data?.message;
  if (error.response?.status === 403) return "Tu rol no tiene permiso para esta acción.";
  if (Array.isArray(message)) return message.join(". ");
  return typeof message === "string" && message ? message : fallback;
}
