import { Card, CardContent } from "@/presentation/components/ui/card";
import type { UserRole } from "@/core/entities/auth.entity";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  type RouteObject,
} from "react-router-dom";
import AuthGuard from "../guards/AuthGuard";
import GuestGuard from "../guards/GuestGuard";
import RoleGuard from "../guards/RoleGuard";
import { SessionBootstrap } from "../guards/SessionBootstrap";
import OperationsProvider from "../layouts/OperationsProvider";
import {
  AccountPage,
  AccountsPage,
  AuthLayout,
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
  ProductEditPage,
  TableMapPage,
  UsersPage,
  WaiterOrderPage,
  WaiterOrdersPage,
  PublicReceiptPage,
  ReportsPage,
  RoleLayout,
} from "./lazy-routes";
import { HomeRedirect, RouteLoading, RouteMessage } from "./route-pages";

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
  CASHIER: { title: "Caja", description: "Turno, cuentas y cobros." },
};

const appRoutes: RouteObject[] = [
  { path: "/", element: <HomeRedirect /> },
  {
    element: (
      <GuestGuard>
        <Suspense fallback={<RouteLoading>Cargando acceso…</RouteLoading>}>
          <AuthLayout />
        </Suspense>
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
            <Suspense fallback={<RouteLoading>Cargando panel…</RouteLoading>}>
              <RoleLayout title={panel.title} />
            </Suspense>
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
              ) : (
                <Card as="section">
                  <CardContent>
                    <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">{panel.title}</h1>
                    <p>{panel.description}</p>
                  </CardContent>
                </Card>
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
                  path: "catalog/products/:productId",
                  element: (
                    <Suspense
                      fallback={<p role="status">Cargando producto…</p>}
                    >
                      <ProductEditPage />
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
];

export const routes = createBrowserRouter([
  {
    path: "/ticket",
    element: (
      <Suspense fallback={<p role="status">Cargando ticket…</p>}>
        <PublicReceiptPage />
      </Suspense>
    ),
  },
  {
    element: (
      <SessionBootstrap>
        <Outlet />
      </SessionBootstrap>
    ),
    children: appRoutes,
  },
]);
