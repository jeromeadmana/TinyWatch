import { useEffect, useRef, useCallback, useState } from "react";
import { MediaStream } from "react-native-webrtc";
import { useAppStore } from "../store/useAppStore";
import type { SignalingMessage } from "../types/signaling";
import {
  createSenderPeerConnection,
  createReceiverPeerConnection,
} from "../services/webrtc";

interface WebRTCHandle {
  handleSignalingMessage: (message: SignalingMessage) => Promise<void>;
  close: () => void;
}

type SendMessage = (message: SignalingMessage) => void;

function mapConnectionState(state: string) {
  switch (state) {
    case "connecting":
      return "connecting" as const;
    case "connected":
      return "connected" as const;
    case "failed":
      return "error" as const;
    case "disconnected":
    case "closed":
      return "idle" as const;
    default:
      return undefined;
  }
}

/**
 * Hook for the Sender: creates a WebRTC peer connection when signaling is
 * connected and a local stream is available.
 * Returns a message handler to pass incoming signaling messages to WebRTC.
 */
export function useSenderWebRTC(
  localStream: MediaStream | null,
  send: SendMessage,
  signalingConnected: boolean,
) {
  const handleRef = useRef<WebRTCHandle | null>(null);

  useEffect(() => {
    if (!localStream || !signalingConnected) return;

    const handle = createSenderPeerConnection(
      localStream,
      send,
      (state) => {
        const mapped = mapConnectionState(state);
        if (mapped) {
          useAppStore.getState().setConnectionStatus(mapped);
        }
      },
    );

    handleRef.current = handle;

    return () => {
      handle.close();
      handleRef.current = null;
    };
  }, [localStream, send, signalingConnected]);

  const onSignalingMessage = useCallback(
    async (message: SignalingMessage) => {
      await handleRef.current?.handleSignalingMessage(message);
    },
    [],
  );

  return { onSignalingMessage };
}

/**
 * Hook for the Receiver: creates a WebRTC peer connection when signaling is
 * connected. Returns the remote stream and a message handler.
 */
export function useReceiverWebRTC(
  send: SendMessage,
  signalingConnected: boolean,
) {
  const handleRef = useRef<WebRTCHandle | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!signalingConnected) return;

    const handle = createReceiverPeerConnection(
      send,
      (stream) => setRemoteStream(stream),
      (state) => {
        const mapped = mapConnectionState(state);
        if (mapped) {
          useAppStore.getState().setConnectionStatus(mapped);
        }
      },
    );

    handleRef.current = handle;

    return () => {
      handle.close();
      handleRef.current = null;
      setRemoteStream(null);
    };
  }, [signalingConnected, send]);

  const onSignalingMessage = useCallback(
    async (message: SignalingMessage) => {
      await handleRef.current?.handleSignalingMessage(message);
    },
    [],
  );

  return { remoteStream, onSignalingMessage };
}
