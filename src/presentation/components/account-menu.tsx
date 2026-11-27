import type { LoginRes } from "@/core/entities/auth.entity";
import { useLogout } from "@/infrastructure/hooks/use-auth";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useRef } from "react";
import { Alert } from "./ui/alert";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useConfirm } from "./use-confirm";

export function AccountMenu({ user }: { user: LoginRes | null }) {
  const logout = useLogout();
  const confirmAction = useConfirm();
  const menuButton = useRef<HTMLButtonElement>(null);
  const logoutRequested = useRef(false);
  const firstName = user?.firstName?.trim();
  const fullName = [firstName, user?.lastName?.trim()].filter(Boolean).join(" ");
  const name = firstName || user?.username || "Usuario";
  const initials = (
    fullName
      ? fullName.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("")
      : Array.from(user?.username ?? "").slice(0, 2).join("")
  ).toLocaleUpperCase("es-PE");

  async function completeMenuChange(open: boolean) {
    if (open || !logoutRequested.current) return;
    logoutRequested.current = false;
    menuButton.current?.focus();
    const accepted = await confirmAction({
      title: "Cerrar sesión",
      message: "¿Deseas cerrar sesión?",
      acceptLabel: "Sí, cerrar sesión",
      cancelLabel: "No, volver",
    });
    if (accepted) logout.mutate();
  }

  return (
    <>
      <DropdownMenu onOpenChangeComplete={completeMenuChange}>
        <DropdownMenuTrigger
          ref={menuButton}
          render={<Button type="button" variant="ghost" />}
          aria-label={`Menú de usuario de ${name}`}
          className="clay-panel min-h-11 min-w-11 gap-2 rounded-full border-border bg-card px-1.5 @sm:pr-3"
        >
          <Avatar aria-hidden="true">
            <AvatarFallback className="clay-raised bg-clay-peach text-xs font-semibold text-foreground">
              {initials || <UserRound />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate @sm:inline">{name}</span>
          <ChevronDown aria-hidden="true" className="hidden size-3.5 text-muted-foreground @sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="clay-raised w-56 max-w-[calc(100vw-1rem)] rounded-xl border p-1.5"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2 text-sm font-semibold wrap-anywhere text-foreground">
              {fullName || name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 gap-2 px-2.5"
              disabled={logout.isPending}
              onClick={() => { logoutRequested.current = true; }}
            >
              <LogOut aria-hidden="true" />
              {logout.isPending ? "Cerrando sesión…" : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {logout.isError && (
        <Alert variant="destructive" className="absolute inset-x-2 top-full z-10 mt-2 w-auto md:right-2 md:left-auto md:max-w-sm">
          No se pudo cerrar sesión. Vuelve a intentar.
        </Alert>
      )}
    </>
  );
}
