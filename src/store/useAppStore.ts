import { create } from "zustand";

export type Role = "none" | "sender" | "receiver";

export type ConnectionStatus =
  | "idle"
  | "discovering"
  | "signaling"
  | "connecting"
  | "connected"
  | "error";

export interface DiscoveredDevice {
  name: string;
  host: string;
  port: number;
  addresses: string[];
}

interface AppState {
  role: Role;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  localIp: string | null;
  discoveredDevices: DiscoveredDevice[];

  setRole: (role: Role) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  setLocalIp: (ip: string | null) => void;
  setDiscoveredDevices: (devices: DiscoveredDevice[]) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "none",
  connectionStatus: "idle",
  errorMessage: null,
  localIp: null,
  discoveredDevices: [],

  setRole: (role) => set({ role }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (errorMessage) => set({ errorMessage }),
  setLocalIp: (localIp) => set({ localIp }),
  setDiscoveredDevices: (discoveredDevices) => set({ discoveredDevices }),
  reset: () =>
    set({
      role: "none",
      connectionStatus: "idle",
      errorMessage: null,
      localIp: null,
      discoveredDevices: [],
    }),
}));
