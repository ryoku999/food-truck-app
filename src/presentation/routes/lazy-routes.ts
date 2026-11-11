import { lazy } from "react";

export const LoginPage = lazy(
  () => import("@/presentation/features/login/pages/LoginPage"),
);
export const BusinessPage = lazy(
  () => import("@/presentation/features/management/BusinessPage"),
);
export const UsersPage = lazy(
  () => import("@/presentation/features/management/UsersPage"),
);
export const LocalPage = lazy(
  () => import("@/presentation/features/local/LocalPage"),
);
export const TableMapPage = lazy(
  () => import("@/presentation/features/local/TableMapPage"),
);
export const CatalogPage = lazy(
  () => import("@/presentation/features/catalog/CatalogPage"),
);
export const WaiterOrdersPage = lazy(
  () => import("@/presentation/features/waiter/WaiterOrdersPage"),
);
export const NewWaiterOrderPage = lazy(
  () => import("@/presentation/features/waiter/NewWaiterOrderPage"),
);
export const WaiterOrderPage = lazy(
  () => import("@/presentation/features/waiter/WaiterOrderPage"),
);
export const ProductionBoard = lazy(
  () => import("@/presentation/features/production/ProductionBoard"),
);
export const CashSessionPage = lazy(
  () => import("@/presentation/features/cashier/CashSessionPage"),
);
export const AccountsPage = lazy(
  () => import("@/presentation/features/cashier/AccountsPage"),
);
export const AccountPage = lazy(
  () => import("@/presentation/features/cashier/AccountPage"),
);
export const CashSettingsPage = lazy(
  () => import("@/presentation/features/cashier/CashSettingsPage"),
);
export const PrinterSettingsPage = lazy(
  () => import("@/presentation/features/printing/PrinterSettingsPage"),
);
export const PrintJobsPage = lazy(
  () => import("@/presentation/features/printing/PrintJobsPage"),
);
export const PrintJobPage = lazy(
  () => import("@/presentation/features/printing/PrintJobPage"),
);
export const ReportsPage = lazy(
  () => import("@/presentation/features/insights/ReportsPage"),
);
export const AuditPage = lazy(
  () => import("@/presentation/features/insights/AuditPage"),
);
