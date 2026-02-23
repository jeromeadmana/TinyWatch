import { useState, useEffect, useCallback } from "react";
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

  const request = useCallback(async () => {
    setChecking(true);
    const result = await requestCameraAndMicPermissions();
    setStatus(result);
    setChecking(false);
    return result;
  }, []);

  return { status, checking, request };
}
