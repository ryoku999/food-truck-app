import { buttonVariants } from "@/presentation/components/ui/button";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Link, Navigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { Spinner } from "../components/ui/spinner";

export function RouteLoading({ children }: PropsWithChildren) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" />
      {children}
    </p>
  );
}

export function HomeRedirect() {
  const user = useAuthStore((state) => state.user);
  return (
    <Navigate
      to={user ? roleBasedRedirection(user.userRole) : "/login"}
      replace
    />
  );
}

export function RouteMessage({ title }: { title: string }) {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 bg-muted p-4 text-center text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <Link className={buttonVariants({  })} to="/">
        Volver al inicio
      </Link>
    </main>
  );
}
