import { useEffect, useRef, useCallback, useState } from "react";
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
 * Returns a send function for outgoing messages and a connected flag.
 */
export function useSignalingServer(onMessage: MessageHandler) {
  const handleRef = useRef<SignalingHandle | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handle = startSignalingServer(
      (msg) => onMessageRef.current(msg),
      (status, error) => {
        const store = useAppStore.getState();
        switch (status) {
          case "listening":
            setConnected(false);
            store.setConnectionStatus("signaling");
            store.setError(null);
            break;
          case "connected":
            setConnected(true);
            store.setConnectionStatus("connected");
            store.setError(null);
            break;
          case "disconnected":
            setConnected(false);
            store.setConnectionStatus("signaling");
            break;
          case "error":
            setConnected(false);
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

  return { send, connected };
}

/**
 * Hook for the Receiver: connects to a TCP signaling server.
 * Call `connect(host)` to initiate the connection.
 * Returns a send function for outgoing messages and a connected flag.
 */
export function useSignalingClient(onMessage: MessageHandler) {
  const handleRef = useRef<SignalingHandle | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);

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
    setConnected(false);

    useAppStore.getState().setConnectionStatus("signaling");
    useAppStore.getState().setError(null);

    const handle = connectToSignalingServer(
      host,
      (msg) => onMessageRef.current(msg),
      (status, error) => {
        const store = useAppStore.getState();
        switch (status) {
          case "connected":
            setConnected(true);
            store.setConnectionStatus("connected");
            store.setError(null);
            break;
          case "disconnected":
            setConnected(false);
            store.setConnectionStatus("idle");
            break;
          case "error":
            setConnected(false);
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

  return { connect, send, connected };
}
