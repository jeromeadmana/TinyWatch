import { useState, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import {
  PermissionStatus,
  requestCameraAndMicPermissions,
  checkCameraAndMicPermissions,
} from "../services/permissions";

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>("undetermined");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkCameraAndMicPermissions().then((result) => {
      setStatus(result);
      setChecking(false);
    });
  }, []);

  // Re-check permissions when app returns to foreground (e.g. from Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkCameraAndMicPermissions().then(setStatus);
      }
    });
    return () => subscription.remove();
  }, []);

  const request = useCallback(async () => {
    setChecking(true);
    const result = await requestCameraAndMicPermissions();
    setStatus(result);
    setChecking(false);
    return result;
  }, []);

  return { status, checking, request };
}
