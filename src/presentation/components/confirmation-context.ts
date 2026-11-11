import { createContext } from "react";

export interface ConfirmationOptions {
  message: string;
  title?: string;
  acceptLabel?: string;
}

export interface ConfirmationService {
  ask: (owner: string, options: ConfirmationOptions) => Promise<boolean>;
  cancel: (owner: string) => void;
}

export const ConfirmationContext = createContext<ConfirmationService | null>(null);
