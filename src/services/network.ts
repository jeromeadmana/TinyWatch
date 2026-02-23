import { Platform } from "react-native";
import TcpSocket from "react-native-tcp-socket";

/**
 * Get the device's local IP address by briefly binding a TCP server
 * to the wifi interface and reading the assigned address.
 */
export async function getLocalIpAddress(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = TcpSocket.createServer(() => {});

    server.on("error", (err) => {
      server.close();
      reject(err);
    });

    server.listen(
      { port: 0, host: "0.0.0.0" },
      () => {
        const addr = server.address();
        server.close();
        if (addr && "address" in addr && addr.address !== "0.0.0.0") {
          resolve(addr.address);
        } else {
          // Fallback: on some devices the server binds to 0.0.0.0
          // Try using interface-specific binding
          resolve(getLocalIpFallback());
        }
      }
    );
  });
}

/**
 * Fallback: connect a socket to a known external address (doesn't send data)
 * to discover the local IP address.
 */
function getLocalIpFallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = TcpSocket.createConnection(
      {
        port: 80,
        host: "192.168.0.1",
        interface: "wifi",
        connectTimeout: 2000,
      },
      () => {
        const localAddr = socket.localAddress;
        socket.destroy();
        if (localAddr) {
          resolve(localAddr);
        } else {
          reject(new Error("Could not determine local IP address"));
        }
      }
    );

    socket.on("error", () => {
      socket.destroy();
      // Last resort — return common default
      reject(new Error("Could not determine local IP address"));
    });
  });
}
