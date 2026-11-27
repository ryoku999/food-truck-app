import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { PwaInstallContext } from "./pwa-install-context";
import { Button } from "./ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaControls({ children }: PropsWithChildren) {
  const [installed, setInstalled] = useState(isStandalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installPrompt) {
      setInstallPrompt(null);
      try {
        await installPrompt.prompt();
      } catch {
        toast.info("Usa la opción de instalación del menú del navegador.");
      }
      return;
    }
    toast.info("Instalar Food Truck en iPhone o iPad", {
      description: "En Safari, toca Compartir, elige Añadir a pantalla de inicio y activa Abrir como app web.",
      duration: 10000,
    });
  }

  const canInstall = !installed && (installPrompt !== null || isAppleMobile());

  return (
    <PwaInstallContext.Provider value={canInstall ? install : null}>
      {children}
      {import.meta.env.PROD && <PwaUpdate />}
    </PwaInstallContext.Provider>
  );
}

function PwaUpdate() {
  const reloadRequested = useRef(false);
  const [reloadReady, setReloadReady] = useState(false);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } =
    useRegisterSW({
      immediate: true,
      onNeedReload: () => setReloadReady(true),
    });
  const mutations = useIsMutating();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const worker = navigator.serviceWorker;
    let hadController = worker.controller !== null;
    const onControllerChange = () => {
      if (!worker.controller) return;
      if (reloadRequested.current) {
        window.location.reload();
        return;
      }
      if (hadController) setReloadReady(true);
      hadController = true;
    };
    worker.addEventListener("controllerchange", onControllerChange);
    return () => worker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!needRefresh && !reloadReady) return null;

  return (
    <section
      aria-label="Actualización de Food Truck"
      className="clay-raised fixed inset-x-3 top-20 z-40 mx-auto max-w-sm rounded-xl border bg-card p-4 sm:right-5 sm:left-auto"
    >
      <p role="status" className="font-semibold">Hay una nueva versión</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {mutations
          ? "Espera a que termine la operación en curso."
          : "Guarda tus cambios y termina las operaciones abiertas antes de recargar."}
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={updating}
          onClick={() => {
            setNeedRefresh(false);
            setReloadReady(false);
          }}
        >
          Más tarde
        </Button>
        <Button
          type="button"
          disabled={mutations > 0 || updating}
          onClick={async () => {
            if (reloadReady) {
              window.location.reload();
              return;
            }
            reloadRequested.current = true;
            setUpdating(true);
            try {
              await updateServiceWorker(true);
            } catch {
              reloadRequested.current = false;
              toast.error("No se pudo actualizar Food Truck.");
              setUpdating(false);
            }
          }}
        >
          {updating ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>
    </section>
  );
}
