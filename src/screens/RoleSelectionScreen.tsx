import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { useAppStore } from "../store/useAppStore";

type Props = NativeStackScreenProps<RootStackParamList, "RoleSelection">;

export default function RoleSelectionScreen({ navigation }: Props) {
  const setRole = useAppStore((s) => s.setRole);

  const handleSelectCamera = () => {
    setRole("sender");
    navigation.navigate("Sender");
  };

  const handleSelectViewer = () => {
    setRole("receiver");
    navigation.navigate("Receiver");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TinyWatch</Text>
        <Text style={styles.subtitle}>Baby Monitor</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.roleButton, styles.cameraButton]}
          onPress={handleSelectCamera}
        >
          <Text style={styles.roleIcon}>📷</Text>
          <Text style={styles.roleTitle}>Camera</Text>
          <Text style={styles.roleDescription}>
            Place this phone near your baby to stream video
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, styles.viewerButton]}
          onPress={handleSelectViewer}
        >
          <Text style={styles.roleIcon}>📺</Text>
          <Text style={styles.roleTitle}>Viewer</Text>
          <Text style={styles.roleDescription}>
            Watch the live stream on this phone
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Both devices must be on the same WiFi network
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#e0e0e0",
  },
  subtitle: {
    fontSize: 16,
    color: "#8888aa",
    marginTop: 4,
  },
  buttonContainer: {
    gap: 20,
  },
  roleButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  cameraButton: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#0f3460",
  },
  viewerButton: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#0f3460",
  },
  roleIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#e0e0e0",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: "#8888aa",
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    color: "#555577",
    fontSize: 13,
    marginTop: 40,
  },
});
