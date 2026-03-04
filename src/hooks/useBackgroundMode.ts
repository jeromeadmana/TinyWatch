import { useEffect } from "react";
import { Platform } from "react-native";
import {
  startBackgroundService,
  stopBackgroundService,
} from "../services/background";

/**
 * Starts a foreground service (Android) when active is true.
 * This keeps the app alive when backgrounded during streaming.
 * On iOS, UIBackgroundModes (audio/voip) in app.config.ts handles this.
 */
export function useBackgroundMode(active: boolean) {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    if (active) {
      startBackgroundService();
    } else {
      stopBackgroundService();
    }

    return () => {
      stopBackgroundService();
    };
  }, [active]);
}
