import { Platform, PermissionsAndroid } from "react-native";

export type PermissionStatus = "granted" | "denied" | "undetermined";

export async function requestCameraAndMicPermissions(): Promise<PermissionStatus> {
  if (Platform.OS === "android") {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraResult = grants[PermissionsAndroid.PERMISSIONS.CAMERA];
    const micResult = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

    if (
      cameraResult === PermissionsAndroid.RESULTS.GRANTED &&
      micResult === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return "granted";
    }

    return "denied";
  }

  // iOS: getUserMedia triggers the system permission prompt.
  // Return "undetermined" so PermissionGate shows a pre-prompt screen first,
  // rather than assuming permissions are granted.
  return "undetermined";
}

export async function checkCameraAndMicPermissions(): Promise<PermissionStatus> {
  if (Platform.OS === "android") {
    const camera = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    const mic = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );

    if (camera && mic) return "granted";
    return "undetermined";
  }

  // iOS: no reliable way to check without requesting; assume undetermined
  return "undetermined";
}
