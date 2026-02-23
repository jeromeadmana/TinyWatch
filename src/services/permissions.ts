import { Platform, PermissionsAndroid } from "react-native";
import { mediaDevices } from "react-native-webrtc";

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

  // iOS: trigger the system permission prompt via a brief getUserMedia call.
  // This is the standard way to request camera/mic permissions with react-native-webrtc on iOS.
  try {
    const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
    // Stop the tracks immediately — we just needed the permission prompt
    stream.getTracks().forEach((t: { stop: () => void }) => t.stop());
    (stream as any).release?.(true);
    return "granted";
  } catch {
    return "denied";
  }
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

  // iOS: no reliable way to check without requesting; assume undetermined.
  // The PermissionGate will show "Grant Permissions" which triggers requestCameraAndMicPermissions.
  return "undetermined";
}
