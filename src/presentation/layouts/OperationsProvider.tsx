import { OperationsContext, useOperationsConnection } from "@/infrastructure/hooks/use-operations";
import type { PropsWithChildren } from "react";

export default function OperationsProvider({ children }: PropsWithChildren) {
  const state = useOperationsConnection();
  return <OperationsContext.Provider value={state}>{children}</OperationsContext.Provider>;
}
