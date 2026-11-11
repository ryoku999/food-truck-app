import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Link, Navigate } from "react-router-dom";

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
    <main className="grid min-h-dvh place-content-center gap-4 bg-base-200 p-4 text-center text-base-content">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Link className="btn btn-primary" to="/">
        Volver al inicio
      </Link>
    </main>
  );
}
