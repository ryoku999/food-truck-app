import { Outlet } from "react-router-dom";
import { Download } from "lucide-react";
import { ModeToggle } from "../components/mode-toggle";
import { usePwaInstall } from "../components/pwa-install-context";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function AuthLayout() {
  const install = usePwaInstall();

  return (
    <main className="clay-stage flex min-h-dvh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img src="/logo.png" alt="" className="size-8 rounded-md object-contain" />
            <span>Food Truck</span>
          </div>
          <ModeToggle />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-240 flex-1 content-center gap-4 px-4 py-6 sm:px-8 md:grid-cols-[1fr_0.96fr] md:gap-5 md:py-12">
        <div aria-hidden="true" className="clay-hero clay-raised grid min-h-28 place-items-center overflow-hidden rounded-2xl border p-3 md:min-h-96 md:p-8">
          <img
            src="/logo.png"
            alt=""
            className="size-24 object-contain drop-shadow-[0_6px_7px_var(--clay-shadow)] md:size-72"
          />
        </div>
        <Card as="section" aria-labelledby="login-title" className="clay-raised w-full justify-center rounded-2xl">
          <CardContent className="gap-6 p-6 sm:p-8">
            <Outlet />
            {install && (
              <Button type="button" variant="outline" onClick={install}>
                <Download aria-hidden="true" />
                Instalar Food Truck
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
