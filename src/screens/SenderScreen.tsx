import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  mediaDevices,
  RTCView,
  MediaStream,
} from "react-native-webrtc";
import { useKeepAwake } from "expo-keep-awake";
import type { RootStackParamList } from "../types/navigation";
import { useAppStore } from "../store/useAppStore";
import PermissionGate from "../components/PermissionGate";

type Props = NativeStackScreenProps<RootStackParamList, "Sender">;

function CameraPreview({ navigation }: Props) {
  useKeepAwake();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = (await mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 480 },
          audio: true,
        })) as MediaStream;

        if (mounted) {
          streamRef.current = stream;
          setLocalStream(stream);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        console.error("Failed to get user media:", err);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera Mode</Text>
        <Text style={styles.status}>{connectionStatus}</Text>
      </View>

      <View style={styles.preview}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.rtcView}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <Text style={styles.placeholderText}>Starting camera...</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text
          style={styles.backLink}
          onPress={() => {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => t.stop());
              streamRef.current = null;
            }
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
  footer: {
    padding: 20,
    alignItems: "center",
  },
  backLink: {
    color: "#6666aa",
    fontSize: 16,
  },
});
