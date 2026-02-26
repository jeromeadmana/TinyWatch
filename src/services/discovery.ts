import Zeroconf from "react-native-zeroconf";
import {
  MDNS_SERVICE_TYPE,
  MDNS_SERVICE_PROTOCOL,
  MDNS_SERVICE_DOMAIN,
  SIGNALING_PORT,
} from "../constants/network";
import type { DiscoveredDevice } from "../store/useAppStore";

type DevicesChangedHandler = (devices: DiscoveredDevice[]) => void;
type StatusHandler = (
  status: "scanning" | "stopped" | "error",
  error?: string,
) => void;

interface DiscoveryPublisher {
  close: () => void;
}

interface DiscoveryBrowser {
  close: () => void;
}

/**
 * Register an mDNS service advertising the TCP signaling server (Sender).
 * Call close() to unregister the service on cleanup.
 */
export function publishSignalingService(
  deviceName: string,
  port: number = SIGNALING_PORT,
): DiscoveryPublisher {
  let closed = false;
  const zc = new Zeroconf();

  try {
    zc.publishService(
      MDNS_SERVICE_TYPE,
      MDNS_SERVICE_PROTOCOL,
      MDNS_SERVICE_DOMAIN,
      deviceName,
      port,
      { role: "sender" },
    );
  } catch (err) {
    console.error("mDNS: failed to publish service:", err);
  }

  return {
    close() {
      if (closed) return;
      closed = true;
      try {
        zc.unpublishService(deviceName);
      } catch (err) {
        console.error("mDNS: failed to unpublish service:", err);
      }
      zc.removeDeviceListeners();
    },
  };
}

/**
 * Browse for TinyWatch mDNS services on the local network (Receiver).
 * Calls onDevicesChanged with the current list whenever services are
 * resolved or removed. Call close() to stop browsing on cleanup.
 */
export function browseForSenders(
  onDevicesChanged: DevicesChangedHandler,
  onStatus: StatusHandler,
): DiscoveryBrowser {
  let closed = false;
  const zc = new Zeroconf();
  const devices = new Map<string, DiscoveredDevice>();

  function emitDevices() {
    if (!closed) {
      onDevicesChanged(Array.from(devices.values()));
    }
  }

  zc.on("start", () => {
    if (!closed) onStatus("scanning");
  });

  zc.on("stop", () => {
    if (!closed) onStatus("stopped");
  });

  zc.on("resolved", (service) => {
    if (closed) return;
    // Filter to IPv4 addresses only
    const ipv4Addresses = service.addresses.filter((addr: string) =>
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr),
    );
    if (ipv4Addresses.length === 0) return;

    devices.set(service.name, {
      name: service.name,
      host: ipv4Addresses[0],
      port: service.port,
      addresses: ipv4Addresses,
    });
    emitDevices();
  });

  zc.on("remove", (serviceName: string) => {
    if (closed) return;
    devices.delete(serviceName);
    emitDevices();
  });

  zc.on("error", (err) => {
    console.error("mDNS browse error:", err);
    if (!closed) {
      onStatus("error", err?.message ?? "mDNS browse failed");
    }
  });

  zc.scan(MDNS_SERVICE_TYPE, MDNS_SERVICE_PROTOCOL, MDNS_SERVICE_DOMAIN);

  return {
    close() {
      if (closed) return;
      closed = true;
      zc.stop();
      zc.removeDeviceListeners();
      devices.clear();
    },
  };
}
