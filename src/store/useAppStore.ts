import { create } from "zustand";

export type Role = "none" | "sender" | "receiver";

export type ConnectionStatus =
  | "idle"
  | "discovering"
  | "signaling"
  | "connecting"
  | "connected"
  | "error";

interface AppState {
  role: Role;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;

  setRole: (role: Role) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "none",
  connectionStatus: "idle",
  errorMessage: null,

  setRole: (role) => set({ role }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({ role: "none", connectionStatus: "idle", errorMessage: null }),
}));
