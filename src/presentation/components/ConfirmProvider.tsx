import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ConfirmationContext, type ConfirmationOptions } from "./confirmation-context";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const pending = useRef<{ owner: string; resolve: (accepted: boolean) => void } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  const finish = useCallback((accepted: boolean) => {
    const request = pending.current;
    pending.current = null;
    setOptions(null);
    request?.resolve(accepted);
  }, []);

  const ask = useCallback((owner: string, next: ConfirmationOptions) => {
    // Ignore repeated requests while the current confirmation is visible.
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>(resolve => {
      pending.current = { owner, resolve };
      setOptions(next);
    });
  }, []);

  const cancel = useCallback((owner: string) => {
    if (pending.current?.owner === owner) finish(false);
  }, [finish]);

  const service = useMemo(() => ({ ask, cancel }), [ask, cancel]);

  useEffect(() => {
    if (options && !dialog.current?.open) dialog.current?.showModal();
    if (!options && dialog.current?.open) dialog.current.close();
  }, [options]);

  useEffect(() => () => {
    pending.current?.resolve(false);
    pending.current = null;
  }, []);

  return <ConfirmationContext.Provider value={service}>
    {children}
    {createPortal(
      <dialog ref={dialog} className="modal" aria-labelledby={titleId} aria-describedby={messageId}
        onCancel={event => { event.preventDefault(); finish(false); }}>
        <div className="modal-box max-w-md bg-base-100 text-base-content">
          <h2 id={titleId} className="text-lg font-bold">{options?.title ?? "Confirmar acción"}</h2>
          <p id={messageId} className="py-4 whitespace-pre-wrap">{options?.message}</p>
          <div className="modal-action flex-wrap">
            <button type="button" className="btn btn-ghost min-h-11" autoFocus onClick={() => finish(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary min-h-11" onClick={() => finish(true)}>{options?.acceptLabel ?? "Aceptar"}</button>
          </div>
        </div>
        <button type="button" className="modal-backdrop" aria-label="Cancelar confirmación" onClick={() => finish(false)} />
      </dialog>,
      document.body,
    )}
  </ConfirmationContext.Provider>;
}
