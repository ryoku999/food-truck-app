import {
  OperationsContext,
  useOperationsConnection,
} from "@/infrastructure/hooks/use-operations";
import type { PropsWithChildren } from "react";
import { OperationSoundContext, useOperationSound } from "@/infrastructure/hooks/use-operation-sound";

export default function OperationsProvider({ children }: PropsWithChildren) {
  const sound = useOperationSound();
  const state = useOperationsConnection(sound.notify);
  return (
    <OperationsContext.Provider value={state}>
      <OperationSoundContext.Provider value={sound}>
        {children}
      </OperationSoundContext.Provider>
    </OperationsContext.Provider>
  );
}
