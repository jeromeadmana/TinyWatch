import TcpSocket from "react-native-tcp-socket";

/**
 * Attempt a route lookup by connecting to the given host.
 * Returns the local address assigned by the OS, or null.
 * The local address may be available even if the connection fails,
 * since the OS assigns it during the route lookup.
 */
function getAddressViaRoute(
  host: string,
  timeout: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = TcpSocket.createConnection(
      { port: 80, host, interface: "wifi", connectTimeout: timeout },
      () => {
        const addr = socket.localAddress;
        socket.destroy();
        resolve(addr || null);
      },
    );

    socket.on("error", () => {
      // The OS may assign a local address even if the remote is unreachable
      const addr = socket.localAddress;
      socket.destroy();
      resolve(addr || null);
    });
  });
}

/**
 * Get the device's local IP address by triggering route lookups.
 * Tries multiple targets in parallel so it works on both internet-connected
 * and internet-less WiFi networks. No data is actually sent.
 */
export async function getLocalIpAddress(): Promise<string> {
  const results = await Promise.all([
    getAddressViaRoute("8.8.8.8", 2000),     // Internet-routable
    getAddressViaRoute("192.168.0.1", 2000),  // Common home/office subnet
    getAddressViaRoute("10.0.0.1", 2000),     // Common enterprise subnet
  ]);

  const ip = results.find((addr) => addr !== null);
  if (ip) return ip;

  throw new Error("Could not determine local IP address");
}
