import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import type { RootStackParamList } from "../types/navigation";
import { useAppStore } from "../store/useAppStore";
import TcpSocket from "react-native-tcp-socket";
import { useSignalingClient } from "../hooks/useSignaling";

type Props = NativeStackScreenProps<RootStackParamList, "Receiver">;

const IP_V4_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export default function ReceiverScreen({ navigation }: Props) {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const [ipInput, setIpInput] = useState("");

  // TCP signaling client — messages will be handled in Phase 4
  const onSignalingMessage = useCallback(() => {
    // Will be wired to WebRTC in Phase 4
  }, []);
  const { connect } = useSignalingClient(onSignalingMessage);

  const handleConnect = () => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (!IP_V4_REGEX.test(ip) || !TcpSocket.isIPv4(ip)) {
      useAppStore.getState().setError("Please enter a valid IPv4 address");
      return;
    }
    useAppStore.getState().setError(null);
    connect(ip);
  };

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

  const isConnecting =
    connectionStatus === "signaling" || connectionStatus === "connecting";
  const isConnected = connectionStatus === "connected";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Viewer Mode</Text>
        <Text style={styles.status}>{connectionStatus}</Text>
      </View>

      <View style={styles.videoArea}>
        {isConnected ? (
          <Text style={styles.placeholderText}>
            Connected! Video will appear here in Phase 4.
          </Text>
        ) : (
          <Text style={styles.placeholderText}>
            Enter the camera's IP address to connect
          </Text>
        )}
      </View>

      {!isConnected && (
        <View style={styles.connectSection}>
          <TextInput
            style={styles.ipInput}
            placeholder="e.g. 192.168.1.42"
            placeholderTextColor="#555577"
            value={ipInput}
            onChangeText={setIpInput}
            keyboardType="numeric"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!isConnecting}
          />
          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting || !ipInput.trim()}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? "Connecting..." : "Connect"}
            </Text>
          </TouchableOpacity>
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>
      )}

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
    textAlign: "center",
    paddingHorizontal: 20,
  },
  connectSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  ipInput: {
    width: "100%",
    backgroundColor: "#0f0f1a",
    borderWidth: 1,
    borderColor: "#0f3460",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#e0e0e0",
    fontSize: 18,
    fontFamily: "monospace",
    textAlign: "center",
  },
  connectButton: {
    marginTop: 12,
    backgroundColor: "#0f3460",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#aa6666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
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
