import { useLogout } from "@/infrastructure/hooks/use-auth";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { NavLink, Outlet } from "react-router-dom";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import ThemeSelector from "../components/ThemeSelector";

export default function RoleLayout({ title }: { title: string }) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const management = user?.userRole === "ADMIN" || user?.userRole === "MANAGER";
  const waiter = user?.userRole === "WAITER";
  const cashLinks = management ? [["/cashier/session", "Turno de caja"], ["/cashier/accounts", "Cuentas"], ["/cashier/settings", "Configurar caja"], ["/printers", "Impresión"]] : [["/session", "Turno de caja"], ["/accounts", "Cuentas"]];
  const hasMap = management || user?.userRole === "WAITER" || user?.userRole === "CASHIER";
  const home = user ? roleBasedRedirection(user.userRole) : "/";
  return (
    <div className="min-h-dvh bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <NavLink to={home} className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={44} height={44} className="size-11 shrink-0 object-contain" />
            <div>
              <p className="font-bold">Food Truck</p>
              <p className="text-sm">{title} · {user?.firstName || user?.username}</p>
            </div>
          </NavLink>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeSelector />
            <button type="button" className="btn btn-outline min-h-11" disabled={logout.isPending} onClick={() => logout.mutate()}>
              {logout.isPending ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
          {logout.isError && <p role="alert" className="alert alert-error basis-full">No se pudo cerrar sesión. Vuelve a intentar.</p>}
        </div>
      </header>
      <div className={management ? "mx-auto grid max-w-7xl gap-4 p-4 sm:p-8 lg:grid-cols-[12rem_minmax(0,1fr)]" : `mx-auto max-w-7xl p-4 sm:p-8 ${waiter ? "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-[calc(5rem+env(safe-area-inset-bottom))]" : ""}`}>
        {hasMap && !waiter && <nav aria-label="Panel" className={`mb-3 flex flex-wrap gap-2 self-start rounded-box border border-base-300 bg-base-100 p-2 ${management ? "lg:flex-col" : ""}`}>
          {[...(management ? [["/reports", "Reportes"], ["/audit-logs", "Auditoría"], ["/business", "Negocio"], ["/users", "Usuarios"], ["/local", "Local"], ["/catalog", "Carta"], ["/kitchen", "Cocina"], ["/bar", "Barra"]] : []), ...cashLinks, ["/print-jobs", "Cola de impresión"], ["/table-map", "Mapa de mesas"]].map(([path, label]) => (
            <NavLink key={label} end={!path.endsWith("/accounts") && path !== "/print-jobs"} to={home + path} className={({ isActive }) => `btn justify-start ${isActive ? "btn-primary" : "btn-ghost"}`}>{label}</NavLink>
          ))}
        </nav>}
        <main className="min-w-0"><Outlet /></main>
      </div>
      {waiter && <nav aria-label="Panel de mozo" className="fixed inset-x-0 bottom-0 z-20 border-t border-base-300 bg-base-100 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <NavLink to="/waiter/table-map" className={({ isActive }) => `btn min-h-11 ${isActive ? "btn-primary" : "btn-ghost"}`}>Mesas</NavLink>
          <NavLink to="/waiter/orders" className={({ isActive }) => `btn min-h-11 ${isActive ? "btn-primary" : "btn-ghost"}`}>Mis pedidos</NavLink>
        </div>
      </nav>}
    </div>
  );
}
