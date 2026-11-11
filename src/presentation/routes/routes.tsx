import type { UserRole } from "@/core/entities/auth.entity";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AuthGuard from "../guards/AuthGuard";
import GuestGuard from "../guards/GuestGuard";
import RoleGuard from "../guards/RoleGuard";
import AuthLayout from "../layouts/AuthLayout";
import RoleLayout from "../layouts/RoleLayout";
import OperationsProvider from "../layouts/OperationsProvider";
import {
  AccountPage,
  AccountsPage,
  BusinessPage,
  CashSessionPage,
  CashSettingsPage,
  CatalogPage,
  LocalPage,
  LoginPage,
  NewWaiterOrderPage,
  PrinterSettingsPage,
  PrintJobPage,
  PrintJobsPage,
  ProductionBoard,
  TableMapPage,
  UsersPage,
  WaiterOrderPage,
  WaiterOrdersPage,
} from "./lazy-routes";
import { HomeRedirect, RouteMessage } from "./route-pages";
import { AuditPage, ReportsPage } from "./lazy-routes";

const panels: Record<UserRole, { title: string; description: string }> = {
  ADMIN: {
    title: "Administración",
    description: "Configuración del negocio, usuarios y operación.",
  },
  MANAGER: {
    title: "Gerencia",
    description: "Seguimiento de la operación y resultados del negocio.",
  },
  WAITER: { title: "Mozos", description: "Mesas, carta y pedidos del local." },
  KITCHEN: {
    title: "Cocina",
    description: "Comandas y estados de preparación de cocina.",
  },
  BAR: {
    title: "Barra",
    description: "Comandas y estados de preparación de bebidas.",
  },
  CASHIER: { title: "Caja", description: "Turno, cuentas y cobros." },
};

export const routes = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  {
    element: (
      <GuestGuard>
        <AuthLayout />
      </GuestGuard>
    ),
    children: [
      {
        path: "/login",
        element: (
          <Suspense fallback={<p role="status">Cargando formulario…</p>}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    element: (
      <AuthGuard>
        <OperationsProvider>
          <Outlet />
        </OperationsProvider>
      </AuthGuard>
    ),
    children: (Object.keys(panels) as UserRole[]).map((role) => {
      const panel = panels[role];
      const management = role === "ADMIN" || role === "MANAGER";
      const cashPrefix = management ? "cashier/" : "";
      return {
        path: roleBasedRedirection(role),
        element: (
          <RoleGuard allowedRoles={[role]}>
            <RoleLayout title={panel.title} />
          </RoleGuard>
        ),
        children: [
          {
            index: true,
            element:
              role === "WAITER" ? (
                <Navigate to="table-map" replace />
              ) : role === "CASHIER" ? (
                <Navigate to="session" replace />
              ) : management ? (
                <Navigate to="reports" replace />
              ) : role === "KITCHEN" || role === "BAR" ? (
                <Suspense fallback={<p role="status">Cargando tablero…</p>}>
                  <ProductionBoard
                    area={role === "KITCHEN" ? "kitchen" : "bar"}
                  />
                </Suspense>
              ) : (
                <section className="card border border-base-300 bg-base-100">
                  <div className="card-body">
                    <h1 className="text-3xl font-bold">{panel.title}</h1>
                    <p>{panel.description}</p>
                  </div>
                </section>
              ),
          },
          ...(role === "ADMIN" || role === "MANAGER"
            ? [
                {
                  path: "business",
                  element: (
                    <Suspense fallback={<p role="status">Cargando negocio…</p>}>
                      <BusinessPage />
                    </Suspense>
                  ),
                },
                {
                  path: "users",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando usuarios…</p>}
                    >
                      <UsersPage />
                    </Suspense>
                  ),
                },
                {
                  path: "local",
                  element: (
                    <Suspense fallback={<p role="status">Cargando local…</p>}>
                      <LocalPage />
                    </Suspense>
                  ),
                },
                {
                  path: "catalog",
                  element: (
                    <Suspense fallback={<p role="status">Cargando carta…</p>}>
                      <CatalogPage />
                    </Suspense>
                  ),
                },
                {
                  path: "kitchen",
                  element: (
                    <Suspense fallback={<p role="status">Cargando cocina…</p>}>
                      <ProductionBoard key="kitchen" area="kitchen" />
                    </Suspense>
                  ),
                },
                {
                  path: "bar",
                  element: (
                    <Suspense fallback={<p role="status">Cargando barra…</p>}>
                      <ProductionBoard key="bar" area="bar" />
                    </Suspense>
                  ),
                },
                {
                  path: "cashier/settings",
                  element: (
                    <Suspense
                      fallback={
                        <p role="status">Cargando configuración de caja…</p>
                      }
                    >
                      <CashSettingsPage />
                    </Suspense>
                  ),
                },
                {
                  path: "printers",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando impresoras…</p>}
                    >
                      <PrinterSettingsPage />
                    </Suspense>
                  ),
                },
                {
                  path: "reports",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando reportes…</p>}
                    >
                      <ReportsPage />
                    </Suspense>
                  ),
                },
                {
                  path: "audit-logs",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando auditoría…</p>}
                    >
                      <AuditPage />
                    </Suspense>
                  ),
                },
              ]
            : []),
          ...(management || role === "CASHIER"
            ? [
                {
                  path: cashPrefix + "session",
                  element: (
                    <Suspense fallback={<p role="status">Cargando turno…</p>}>
                      <CashSessionPage />
                    </Suspense>
                  ),
                },
                {
                  path: cashPrefix + "accounts",
                  element: (
                    <Suspense fallback={<p role="status">Cargando cuentas…</p>}>
                      <AccountsPage />
                    </Suspense>
                  ),
                },
                {
                  path: cashPrefix + "accounts/:orderId",
                  element: (
                    <Suspense fallback={<p role="status">Cargando cuenta…</p>}>
                      <AccountPage />
                    </Suspense>
                  ),
                },
                {
                  path: "print-jobs",
                  element: (
                    <Suspense fallback={<p role="status">Cargando cola…</p>}>
                      <PrintJobsPage />
                    </Suspense>
                  ),
                },
                {
                  path: "print-jobs/:jobId",
                  element: (
                    <Suspense fallback={<p role="status">Cargando trabajo…</p>}>
                      <PrintJobPage />
                    </Suspense>
                  ),
                },
              ]
            : []),
          ...(["ADMIN", "MANAGER", "WAITER", "CASHIER"].includes(role)
            ? [
                {
                  path: "table-map",
                  element: (
                    <Suspense fallback={<p role="status">Cargando mapa…</p>}>
                      <TableMapPage />
                    </Suspense>
                  ),
                },
              ]
            : []),
          ...(role === "WAITER"
            ? [
                {
                  path: "orders",
                  element: (
                    <Suspense fallback={<p role="status">Cargando pedidos…</p>}>
                      <WaiterOrdersPage />
                    </Suspense>
                  ),
                },
                {
                  path: "orders/new",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando formulario…</p>}
                    >
                      <NewWaiterOrderPage />
                    </Suspense>
                  ),
                },
                {
                  path: "orders/:orderId",
                  element: (
                    <Suspense fallback={<p role="status">Cargando comanda…</p>}>
                      <WaiterOrderPage />
                    </Suspense>
                  ),
                },
              ]
            : []),
        ],
      };
    }),
  },
  {
    path: "/403",
    element: <RouteMessage title="403 · No tienes acceso a este panel" />,
  },
  { path: "*", element: <RouteMessage title="404 · Página no encontrada" /> },
]);
