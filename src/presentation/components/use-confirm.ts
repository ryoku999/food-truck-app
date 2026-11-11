import { useCallback, useContext, useEffect, useId } from "react";
import { ConfirmationContext, type ConfirmationOptions } from "./confirmation-context";

export function useConfirm() {
  const service = useContext(ConfirmationContext);
  const owner = useId();
  if (!service) throw new Error("useConfirm requiere ConfirmProvider");
  useEffect(() => () => service.cancel(owner), [service, owner]);
  return useCallback(
    (options: string | ConfirmationOptions) =>
      service.ask(owner, typeof options === "string" ? { message: options } : options),
    [service, owner],
  );
}
