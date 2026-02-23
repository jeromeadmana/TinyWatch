import { Platform, PermissionsAndroid } from "react-native";

export type PermissionStatus = "granted" | "denied" | "undetermined";

export async function requestCameraAndMicPermissions(): Promise<PermissionStatus> {
  if (Platform.OS === "android") {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraGranted =
      grants[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const micGranted =
      grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (cameraGranted && micGranted) return "granted";
    return "denied";
  }

  // iOS permissions are handled by react-native-webrtc's getUserMedia call
  return "granted";
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

  return "undetermined";
}
