export type ApiEnvelope<T> = {
  success: boolean;
  path: string;
  data: T;
};
