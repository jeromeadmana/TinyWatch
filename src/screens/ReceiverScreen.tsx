import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RTCView } from "react-native-webrtc";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import type { RootStackParamList } from "../types/navigation";
import type { SignalingMessage } from "../types/signaling";
import { useAppStore, type DiscoveredDevice } from "../store/useAppStore";
import TcpSocket from "react-native-tcp-socket";
import { useSignalingClient } from "../hooks/useSignaling";
import { useReceiverWebRTC } from "../hooks/useWebRTC";
import { useServiceBrowser } from "../hooks/useDiscovery";

type Props = NativeStackScreenProps<RootStackParamList, "Receiver">;

const IP_V4_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export default function ReceiverScreen({ navigation }: Props) {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const discoveredDevices = useAppStore((s) => s.discoveredDevices);
  const [ipInput, setIpInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Explicit ref to break circular dependency between hooks
  const onWebRTCMessage = useRef<((msg: SignalingMessage) => void) | undefined>(undefined);

  // TCP signaling client — pass incoming messages to WebRTC
  const { connect, send, connected: signalingConnected } = useSignalingClient((msg) => {
    onWebRTCMessage.current?.(msg);
  });

  // WebRTC peer connection — activates when signaling is connected
  const { remoteStream, onSignalingMessage } = useReceiverWebRTC(send, signalingConnected);
  onWebRTCMessage.current = onSignalingMessage;

  // mDNS service browser — starts scanning on mount
  const { stopBrowsing } = useServiceBrowser();

  // Connect to a discovered device
  const handleSelectDevice = useCallback(
    (device: DiscoveredDevice) => {
      stopBrowsing();
      useAppStore.getState().setError(null);
      connect(device.host);
    },
    [connect, stopBrowsing],
  );

  // Manual IP connect
  const handleConnect = useCallback(() => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (!IP_V4_REGEX.test(ip) || !TcpSocket.isIPv4(ip)) {
      useAppStore.getState().setError("Please enter a valid IPv4 address");
      return;
    }
    stopBrowsing();
    useAppStore.getState().setError(null);
    connect(ip);
  }, [ipInput, connect, stopBrowsing]);

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

  const isDiscovering = connectionStatus === "discovering";
  const isConnecting =
    connectionStatus === "signaling" || connectionStatus === "connecting";
  const isConnected = connectionStatus === "connected";

  const remoteStreamURL = remoteStream?.toURL() ?? "";

  const statusLabel =
    connectionStatus === "connected" && remoteStream
      ? "Receiving stream"
      : connectionStatus === "connected"
        ? "Connected, waiting for video..."
        : connectionStatus === "discovering"
          ? "Searching for cameras..."
          : connectionStatus === "signaling"
            ? "Connecting..."
            : connectionStatus === "connecting"
              ? "Setting up stream..."
              : connectionStatus === "error"
                ? "Error"
                : connectionStatus;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Viewer Mode</Text>
        <Text
          style={[
            styles.status,
            isConnected && remoteStream && styles.statusConnected,
          ]}
        >
          {statusLabel}
        </Text>
      </View>

      <View style={styles.videoArea}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStreamURL}
            style={styles.rtcView}
            objectFit="contain"
            mirror={false}
          />
        ) : isConnected ? (
          <Text style={styles.placeholderText}>
            Waiting for video stream...
          </Text>
        ) : (
          <Text style={styles.placeholderText}>
            {isDiscovering
              ? "Looking for cameras on your network..."
              : "Enter the camera's IP address to connect"}
          </Text>
        )}
      </View>

      {!isConnected && (
        <View style={styles.connectSection}>
          {/* Discovered devices list */}
          {isDiscovering && discoveredDevices.length > 0 && (
            <View style={styles.deviceList}>
              {discoveredDevices.map((device) => (
                <TouchableOpacity
                  key={device.name}
                  style={styles.deviceItem}
                  onPress={() => handleSelectDevice(device)}
                >
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceAddress}>
                    {device.host}:{device.port}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Scanning indicator */}
          {isDiscovering && discoveredDevices.length === 0 && (
            <View style={styles.scanningRow}>
              <ActivityIndicator size="small" color="#6666aa" />
              <Text style={styles.scanningText}>
                Scanning for cameras...
              </Text>
            </View>
          )}

          {/* Manual IP toggle */}
          {isDiscovering && !showManualInput && (
            <TouchableOpacity onPress={() => setShowManualInput(true)}>
              <Text style={styles.manualToggle}>Enter IP manually</Text>
            </TouchableOpacity>
          )}

          {/* Manual IP input (shown when toggled or when not discovering) */}
          {(showManualInput || !isDiscovering) && (
            <>
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
            </>
          )}

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
  statusConnected: {
    color: "#66aa66",
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
  rtcView: {
    width: "100%",
    height: "100%",
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
  deviceList: {
    width: "100%",
    marginBottom: 12,
  },
  deviceItem: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#0f3460",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  deviceAddress: {
    color: "#8888aa",
    fontSize: 13,
    fontFamily: "monospace",
    marginLeft: 12,
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  scanningText: {
    color: "#8888aa",
    fontSize: 14,
  },
  manualToggle: {
    color: "#6666aa",
    fontSize: 14,
    textDecorationLine: "underline",
    marginBottom: 12,
    textAlign: "center",
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
