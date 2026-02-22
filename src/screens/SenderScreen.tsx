import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { useAppStore } from "../store/useAppStore";

type Props = NativeStackScreenProps<RootStackParamList, "Sender">;

export default function SenderScreen({ navigation }: Props) {
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera Mode</Text>
        <Text style={styles.status}>{connectionStatus}</Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.placeholderText}>Camera preview will appear here</Text>
      </View>

      <View style={styles.footer}>
        <Text
          style={styles.backLink}
          onPress={() => {
            useAppStore.getState().reset();
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
  preview: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    backgroundColor: "#0f0f1a",
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
