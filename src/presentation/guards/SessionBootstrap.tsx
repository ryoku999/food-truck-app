import { authService } from "@/infrastructure/services/auth.service";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { isAxiosError } from "axios";
import { useEffect, useState, type PropsWithChildren } from "react";

export function SessionBootstrap({ children }: PropsWithChildren) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const setUser = useAuthStore((store) => store.setUser);

  useEffect(() => {
    const controller = new AbortController();
    void authService.me(controller.signal).then(
      (user) => {
        if (controller.signal.aborted) return;
        setUser(user);
        setState("ready");
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          isAxiosError(error) && error.response?.status === 401
            ? "ready"
            : "error",
        );
      },
    );
    return () => controller.abort();
  }, [attempt, setUser]);

  if (state === "ready") return children;

  return (
    <main className="grid min-h-dvh place-items-center bg-base-200 p-4 text-base-content">
      {state === "loading" ? (
        <p role="status">Verificando sesión…</p>
      ) : (
        <div className="space-y-4 text-center">
          <p role="alert">No se pudo conectar con el servidor.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setState("loading");
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
    </main>
  );
}
