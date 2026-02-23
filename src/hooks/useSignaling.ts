import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import type { SignalingMessage } from "../types/signaling";
import {
  startSignalingServer,
  connectToSignalingServer,
} from "../services/signaling";

type MessageHandler = (message: SignalingMessage) => void;

interface SignalingHandle {
  send: (message: SignalingMessage) => void;
  close: () => void;
}

/**
 * Hook for the Sender: starts a TCP signaling server.
 * Returns a send function for outgoing messages.
 */
export function useSignalingServer(onMessage: MessageHandler) {
  const handleRef = useRef<SignalingHandle | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const handle = startSignalingServer(
      (msg) => onMessageRef.current(msg),
      (status, error) => {
        const store = useAppStore.getState();
        switch (status) {
          case "listening":
            store.setConnectionStatus("signaling");
            store.setError(null);
            break;
          case "connected":
            store.setConnectionStatus("connected");
            store.setError(null);
            break;
          case "disconnected":
            store.setConnectionStatus("signaling");
            break;
          case "error":
            store.setConnectionStatus("error");
            store.setError(error ?? "Signaling server error");
            break;
        }
      },
    );

    handleRef.current = handle;

    return () => {
      handle.close();
      handleRef.current = null;
    };
  }, []);

  const send = useCallback((message: SignalingMessage) => {
    handleRef.current?.send(message);
  }, []);

  return { send };
}

/**
 * Hook for the Receiver: connects to a TCP signaling server.
 * Call `connect(host)` to initiate the connection.
 * Returns a send function for outgoing messages.
 */
export function useSignalingClient(onMessage: MessageHandler) {
  const handleRef = useRef<SignalingHandle | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.close();
      handleRef.current = null;
    };
  }, []);

  const connect = useCallback((host: string) => {
    // Close any existing connection
    handleRef.current?.close();

    useAppStore.getState().setConnectionStatus("signaling");
    useAppStore.getState().setError(null);

    const handle = connectToSignalingServer(
      host,
      (msg) => onMessageRef.current(msg),
      (status, error) => {
        const store = useAppStore.getState();
        switch (status) {
          case "connected":
            store.setConnectionStatus("connected");
            store.setError(null);
            break;
          case "disconnected":
            store.setConnectionStatus("idle");
            break;
          case "error":
            store.setConnectionStatus("error");
            store.setError(error ?? "Connection failed");
            break;
        }
      },
    );

    handleRef.current = handle;
  }, []);

  const send = useCallback((message: SignalingMessage) => {
    handleRef.current?.send(message);
  }, []);

  return { connect, send };
}
