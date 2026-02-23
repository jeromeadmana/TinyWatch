import React, { useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import type { RootStackParamList } from "../types/navigation";
import { useAppStore } from "../store/useAppStore";

type Props = NativeStackScreenProps<RootStackParamList, "Receiver">;

export default function ReceiverScreen({ navigation }: Props) {
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  // Only keep screen awake when actively connected
  useEffect(() => {
    if (connectionStatus === "connected") {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
    return () => { deactivateKeepAwake(); };
  }, [connectionStatus]);

  // Reset store state on unmount (covers Android hardware back button)
  useEffect(() => {
    return () => {
      useAppStore.getState().reset();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Viewer Mode</Text>
        <Text style={styles.status}>{connectionStatus}</Text>
      </View>

      <View style={styles.videoArea}>
        <Text style={styles.placeholderText}>
          Waiting for connection to camera...
        </Text>
      </View>

      <View style={styles.footer}>
        <Text
          style={styles.backLink}
          onPress={() => {
            navigation.navigate("RoleSelection");
          }}
        >
          ← Back to role selection
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e0e0e0",
  },
  status: {
    fontSize: 14,
    color: "#8888aa",
    marginTop: 4,
  },
  videoArea: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    backgroundColor: "#0f0f1a",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#555577",
    fontSize: 16,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  backLink: {
    color: "#6666aa",
    fontSize: 16,
  },
});
