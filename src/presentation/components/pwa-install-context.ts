import { createContext, useContext } from "react";

export const PwaInstallContext = createContext<(() => void) | null>(null);

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
