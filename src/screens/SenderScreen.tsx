import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  mediaDevices,
  RTCView,
  MediaStream,
} from "react-native-webrtc";
import { useKeepAwake } from "expo-keep-awake";
import type { RootStackParamList } from "../types/navigation";
import type { SignalingMessage } from "../types/signaling";
import { useAppStore } from "../store/useAppStore";
import PermissionGate from "../components/PermissionGate";
import { useSignalingServer } from "../hooks/useSignaling";
import { useSenderWebRTC } from "../hooks/useWebRTC";
import { useServicePublisher } from "../hooks/useDiscovery";
import { getLocalIpAddress } from "../services/network";
import { SIGNALING_PORT } from "../constants/network";

type Props = NativeStackScreenProps<RootStackParamList, "Sender">;

function CameraPreview({ navigation }: Props) {
  useKeepAwake();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const localIp = useAppStore((s) => s.localIp);
  const streamRef = useRef<MediaStream | null>(null);

  // Explicit ref to break circular dependency between hooks
  const onWebRTCMessage = useRef<((msg: SignalingMessage) => void) | undefined>(undefined);

  // TCP signaling server — pass incoming messages to WebRTC
  const { send, connected: signalingConnected } = useSignalingServer((msg) => {
    onWebRTCMessage.current?.(msg);
  });

  // WebRTC peer connection — creates offer when signaling + localStream ready
  const { onSignalingMessage } = useSenderWebRTC(localStream, send, signalingConnected);
  onWebRTCMessage.current = onSignalingMessage;

  // Publish mDNS service when signaling server is listening
  const isListening = connectionStatus === "signaling" || connectionStatus === "connected";
  const deviceNameRef = useRef(
    `TinyWatch-${Platform.OS}-${Math.random().toString(36).slice(2, 6)}`,
  );
  useServicePublisher(deviceNameRef.current, isListening);

  // Resolve local IP address
  useEffect(() => {
    getLocalIpAddress()
      .then((ip) => useAppStore.getState().setLocalIp(ip))
      .catch((err) =>
        console.warn("Could not determine local IP:", err.message)
      );
  }, []);

  // Start camera
  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 480 },
          audio: true,
        });

        if (mounted) {
          streamRef.current = stream;
          setLocalStream(stream);
        } else {
          stream.release(true);
        }
      } catch (err) {
        console.error("Failed to get user media:", err);
        if (mounted) {
          useAppStore.getState().setError(
            err instanceof Error ? err.message : "Failed to start camera"
          );
          useAppStore.getState().setConnectionStatus("error");
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.release(true);
        streamRef.current = null;
      }
    };
  }, []);

  // Reset store state on unmount (covers Android hardware back button)
  useEffect(() => {
    return () => {
      useAppStore.getState().reset();
    };
  }, []);

  const streamURL = localStream?.toURL() ?? "";

  const statusLabel =
    connectionStatus === "connected"
      ? "Streaming to viewer"
      : connectionStatus === "signaling"
        ? "Waiting for viewer..."
        : connectionStatus === "connecting"
          ? "Connecting..."
          : connectionStatus === "error"
            ? "Error"
            : connectionStatus;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera Mode</Text>
        <Text
          style={[
            styles.status,
            connectionStatus === "connected" && styles.statusConnected,
          ]}
        >
          {statusLabel}
        </Text>
      </View>

      <View style={styles.preview}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : localStream ? (
          <RTCView
            streamURL={streamURL}
            style={styles.rtcView}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <Text style={styles.placeholderText}>Starting camera...</Text>
        )}
      </View>

      <View style={styles.footer}>
        {localIp ? (
          <>
            <Text style={styles.ipText}>
              IP: {localIp}:{SIGNALING_PORT}
            </Text>
            {isListening && (
              <Text style={styles.discoverableText}>
                Discoverable on local network
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.ipText}>Detecting IP address...</Text>
        )}
        <Text
          style={styles.backLink}
          onPress={() => {
            if (streamRef.current) {
              streamRef.current.release(true);
              streamRef.current = null;
            }
            navigation.navigate("RoleSelection");
          }}
        >
          ← Back to role selection
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function SenderScreen(props: Props) {
  return (
    <PermissionGate>
      <CameraPreview {...props} />
    </PermissionGate>
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
  preview: {
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
  },
  errorText: {
    color: "#aa6666",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  ipText: {
    color: "#aaaacc",
    fontSize: 16,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  discoverableText: {
    color: "#66aa66",
    fontSize: 13,
    marginBottom: 8,
  },
  backLink: {
    color: "#6666aa",
    fontSize: 16,
  },
});
