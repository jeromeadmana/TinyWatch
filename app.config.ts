import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TinyWatch",
  slug: "TinyWatch",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "Camera is used to monitor your baby",
      NSMicrophoneUsageDescription:
        "Microphone captures audio from the baby's room",
      NSLocalNetworkUsageDescription:
        "Used to connect to the viewer device on your local network",
      UIBackgroundModes: ["audio", "voip"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "BLUETOOTH_SCAN",
      "BLUETOOTH_ADVERTISE",
      "BLUETOOTH_CONNECT",
    ],
  },
  plugins: [
    "expo-dev-client",
    "@config-plugins/react-native-webrtc",
  ],
});
