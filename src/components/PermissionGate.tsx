import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { usePermissions } from "../hooks/usePermissions";

interface Props {
  children: React.ReactNode;
}

export default function PermissionGate({ children }: Props) {
  const { status, checking, request } = usePermissions();

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6666aa" />
        <Text style={styles.text}>Checking permissions...</Text>
      </View>
    );
  }

  if (status === "granted") {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Camera & Microphone Access</Text>
      <Text style={styles.text}>
        TinyWatch needs camera and microphone access to monitor your baby.
      </Text>

      {status === "undetermined" ? (
        <TouchableOpacity style={styles.button} onPress={request}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.deniedText}>
            Permissions were denied. Please enable them in Settings.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e0e0e0",
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    color: "#8888aa",
    textAlign: "center",
    marginTop: 12,
  },
  deniedText: {
    fontSize: 14,
    color: "#aa6666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#0f3460",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
  },
});
