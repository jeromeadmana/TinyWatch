import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  publishSignalingService,
  browseForSenders,
} from "../services/discovery";

interface PublisherHandle {
  close: () => void;
}

interface BrowserHandle {
  close: () => void;
}

/**
 * Hook for the Sender: publishes an mDNS service when the signaling server
 * is listening. Unpublishes on unmount or when isListening becomes false.
 */
export function useServicePublisher(deviceName: string, isListening: boolean) {
  const handleRef = useRef<PublisherHandle | null>(null);

  useEffect(() => {
    if (!isListening) return;

    const handle = publishSignalingService(deviceName);
    handleRef.current = handle;

    return () => {
      handle.close();
      handleRef.current = null;
    };
  }, [isListening, deviceName]);
}

/**
 * Hook for the Receiver: scans for TinyWatch senders via mDNS.
 * Updates discoveredDevices in the store.
 * Returns stopBrowsing() for manual control (e.g. when user selects a device).
 */
export function useServiceBrowser() {
  const handleRef = useRef<BrowserHandle | null>(null);

  useEffect(() => {
    const store = useAppStore.getState();
    store.setConnectionStatus("discovering");
    store.setError(null);
    store.setDiscoveredDevices([]);

    const handle = browseForSenders(
      (devices) => {
        useAppStore.getState().setDiscoveredDevices(devices);
      },
      (status, error) => {
        if (status === "error") {
          useAppStore.getState().setError(error ?? "Discovery failed");
        }
      },
    );

    handleRef.current = handle;

    return () => {
      handle.close();
      handleRef.current = null;
      useAppStore.getState().setDiscoveredDevices([]);
    };
  }, []);

  const stopBrowsing = useCallback(() => {
    handleRef.current?.close();
    handleRef.current = null;
  }, []);

  return { stopBrowsing };
}
