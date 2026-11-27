import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ConfirmationContext,
  type ConfirmationOptions,
} from "./confirmation-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [open, setOpen] = useState(false);
  const pending = useRef<{
    owner: string;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const finish = useCallback((accepted: boolean) => {
    const request = pending.current;
    pending.current = null;
    setOpen(false);
    request?.resolve(accepted);
  }, []);

  const ask = useCallback((owner: string, next: ConfirmationOptions) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = { owner, resolve };
      trigger.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  const cancel = useCallback(
    (owner: string) => {
      if (pending.current?.owner === owner) finish(false);
    },
    [finish],
  );

  const service = useMemo(() => ({ ask, cancel }), [ask, cancel]);

  useEffect(
    () => () => {
      pending.current?.resolve(false);
      pending.current = null;
    },
    [],
  );

  return (
    <ConfirmationContext.Provider value={service}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => { if (!next) finish(false); }}>
        <AlertDialogContent
          initialFocus={cancelButton}
          finalFocus={trigger}
          onDismiss={() => finish(false)}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title ?? "Confirmar acción"}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {options?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelButton}>{options?.cancelLabel ?? "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={() => finish(true)}>
              {options?.acceptLabel ?? "Aceptar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}
