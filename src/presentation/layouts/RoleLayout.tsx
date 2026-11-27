import type { LoginRes } from "@/core/entities/auth.entity";
import { useOperationsState } from "@/infrastructure/hooks/use-operations";
import { useAuthStore } from "@/infrastructure/storage/auth-storage";
import { roleBasedRedirection } from "@/shared/utils/role-based-redirection";
import {
  BarChart3,
  Building2,
  ChefHat,
  ClipboardList,
  LayoutGrid,
  LoaderCircle,
  Printer,
  Radio,
  ReceiptText,
  Settings2,
  Store,
  Users,
  Wallet,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Link, matchPath, NavLink, Outlet, useLocation } from "react-router-dom";
import { AccountMenu } from "../components/account-menu";
import { ModeToggle } from "../components/mode-toggle";
import { Badge } from "../components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { buttonVariants } from "../components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

type PanelLink = {
  path: string;
  label: string;
  icon: LucideIcon;
  includeChildren?: boolean;
};

type PanelGroup = { title: string; links: PanelLink[] };

const waiterLinks: PanelLink[] = [
  { path: "/table-map", label: "Mesas", icon: LayoutGrid },
  { path: "/orders", label: "Mis pedidos", icon: ClipboardList, includeChildren: true },
];

const managementLinks: PanelLink[] = [
  { path: "/reports", label: "Reportes", icon: BarChart3 },
  { path: "/business", label: "Negocio", icon: Store },
  { path: "/users", label: "Usuarios", icon: Users },
  { path: "/local", label: "Local", icon: Building2 },
  { path: "/catalog", label: "Carta", icon: ChefHat, includeChildren: true },
];

const operationsLinks: PanelLink[] = [
  { path: "/print-jobs", label: "Cola de impresión", icon: Printer, includeChildren: true },
  { path: "/table-map", label: "Mapa de mesas", icon: LayoutGrid },
];

const connectionLabels = {
  online: "En vivo",
  connecting: "Conectando",
  offline: "Sin actualizaciones en vivo",
} as const;

function Brand({ home, title }: { home: string; title: string }) {
  return (
    <Link
      to={home}
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring group-data-[collapsible=icon]:justify-center"
    >
      <span className="clay-raised grid size-11 shrink-0 place-items-center rounded-lg bg-clay-peach">
        <img src="/logo.png" alt="" className="size-8 object-contain" />
      </span>
      <span className="min-w-0 group-data-[collapsible=icon]:sr-only">
        <span className="block truncate text-base leading-tight font-semibold tracking-tight @max-xs:text-sm">
          Food Truck
        </span>
        <span className="block truncate text-xs text-muted-foreground">{title}</span>
      </span>
    </Link>
  );
}

function PanelSidebar({
  groups,
  home,
  title,
  pathname,
}: {
  groups: PanelGroup[];
  home: string;
  title: string;
  pathname: string;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="floating" collapsible="icon" className="md:p-3">
      <SidebarHeader className="px-3 pt-4 pb-3 group-data-[collapsible=icon]:px-1">
        <Brand home={home} title={title} />
      </SidebarHeader>
      <SidebarContent className="clay-sidebar-scrollbar px-1 group-data-[collapsible=icon]:px-0">
        <nav aria-label="Panel" className="space-y-1">
          {groups.map(({ title: groupTitle, links }) => (
            <SidebarGroup key={groupTitle} className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
              <SidebarGroupLabel>{groupTitle}</SidebarGroupLabel>
              <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
                {links.map(({ path, label, icon: Icon, includeChildren }) => {
                  const to = home + path;
                  const end = !includeChildren;
                  const active = Boolean(matchPath({ path: to, end }, pathname));
                  return (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={label}
                        className="h-11 gap-2.5 px-3 group-data-[collapsible=icon]:[&>span]:sr-only"
                        render={
                          <NavLink
                            to={to}
                            end={end}
                            onClick={(event) => {
                              if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                                setOpenMobile(false);
                              }
                            }}
                          />
                        }
                      >
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

function ConnectionStatus() {
  const operations = useOperationsState();
  const label = connectionLabels[operations];
  const live = operations === "online";
  const connecting = operations === "connecting";
  const Icon = live ? Radio : connecting ? LoaderCircle : WifiOff;

  return (
    <Badge
      role="status"
      title={label}
      variant={live ? "success" : connecting ? "warning" : "secondary"}
      className="shrink-0 whitespace-nowrap"
    >
      <Icon aria-hidden="true" className={connecting ? "motion-safe:animate-spin" : undefined} />
      <span className={live ? undefined : "sr-only @xl:not-sr-only"}>{label}</span>
    </Badge>
  );
}

function SessionActions({ user }: { user: LoginRes | null }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <ConnectionStatus />
      <ModeToggle />
      <AccountMenu user={user} />
    </div>
  );
}

function SkipLink() {
  return (
    <a
      href="#panel-principal"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-3"
    >
      Ir al contenido
    </a>
  );
}

function WaiterLayout({ home, title, user }: { home: string; title: string; user: LoginRes }) {
  return (
    <div className="clay-stage min-h-dvh">
      <SkipLink />
      <div className="mx-auto min-h-dvh w-full max-w-lg bg-background sm:border-x">
        <header className="clay-sticky-header @container flex min-h-16 items-center gap-2 px-3">
          <Brand home={home} title={title} />
          <SessionActions user={user} />
        </header>
        <main
          id="panel-principal"
          tabIndex={-1}
          className="min-w-0 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        >
          <Outlet />
        </main>
      </div>
      <nav
        aria-label="Panel de mozo"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="clay-raised pointer-events-auto mx-auto grid max-w-[31rem] grid-cols-2 gap-1.5 rounded-xl border bg-card p-1.5">
          {waiterLinks.map(({ path, label, icon: Icon, includeChildren }) => (
            <NavLink
              key={path}
              to={home + path}
              end={!includeChildren}
              className={({ isActive }) => buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                className: "min-w-0 gap-2",
              })}
            >
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function RoleLayout({ title }: { title: string }) {
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const home = user ? roleBasedRedirection(user.userRole) : "/";

  if (user?.userRole === "WAITER") {
    return (
      <TooltipProvider delay={300}>
        <WaiterLayout home={home} title={title} user={user} />
      </TooltipProvider>
    );
  }

  const management = user?.userRole === "ADMIN" || user?.userRole === "MANAGER";
  const cashPrefix = management ? "/cashier" : "";
  const cashLinks: PanelLink[] = [
    { path: cashPrefix + "/session", label: "Turno de caja", icon: Wallet },
    { path: cashPrefix + "/accounts", label: "Cuentas", icon: ReceiptText, includeChildren: true },
    ...(management
      ? [{ path: "/cashier/settings", label: "Configurar caja", icon: Settings2 }]
      : []),
  ];
  const groups: PanelGroup[] = [
    ...(management ? [{ title: "Gestión", links: managementLinks }] : []),
    { title: "Caja", links: cashLinks },
    {
      title: "Operación",
      links: management
        ? [{ path: "/printers", label: "Impresión", icon: Printer }, ...operationsLinks]
        : operationsLinks,
    },
  ];
  const current = groups.flatMap(({ links }) => links).find(({ path, includeChildren }) =>
    matchPath({ path: home + path, end: !includeChildren }, pathname),
  );

  return (
    <TooltipProvider delay={300}>
      <SidebarProvider className="clay-stage">
        <SkipLink />
        <PanelSidebar groups={groups} home={home} title={title} pathname={pathname} />
        <SidebarInset id="panel-principal" tabIndex={-1} className="min-w-0 bg-transparent">
          <header className="clay-sticky-header">
            <div className="@container relative mx-auto flex min-h-16 w-full max-w-340 items-center gap-1 px-2 sm:gap-3 sm:px-5 md:px-6 lg:px-8">
              <Tooltip>
                <TooltipTrigger render={<SidebarTrigger />} />
                <TooltipContent>Menú de navegación</TooltipContent>
              </Tooltip>
              <Breadcrumb aria-label="Ubicación en el panel" className="min-w-0">
                <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-2 sm:text-sm">
                  <BreadcrumbItem className={current ? "hidden shrink-0 sm:inline-flex" : "min-w-0"}>
                    <BreadcrumbLink render={<Link to={home} />} className="truncate">{title}</BreadcrumbLink>
                  </BreadcrumbItem>
                  {current && (
                    <>
                      <BreadcrumbSeparator className="hidden shrink-0 sm:inline-flex" />
                      <BreadcrumbItem className="min-w-0">
                        <BreadcrumbPage className="truncate font-medium">{current.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
              <SessionActions user={user} />
            </div>
          </header>
          <div className="@container mx-auto w-full max-w-340 p-4 sm:p-6 lg:px-8 lg:pb-8">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
