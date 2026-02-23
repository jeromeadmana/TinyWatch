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
  localIp: string | null;

  setRole: (role: Role) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  setLocalIp: (ip: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "none",
  connectionStatus: "idle",
  errorMessage: null,
  localIp: null,

  setRole: (role) => set({ role }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (errorMessage) => set({ errorMessage }),
  setLocalIp: (localIp) => set({ localIp }),
  reset: () =>
    set({
      role: "none",
      connectionStatus: "idle",
      errorMessage: null,
      localIp: null,
    }),
}));
