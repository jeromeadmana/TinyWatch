import TcpSocket from "react-native-tcp-socket";

/**
 * Get the device's local IP address by briefly connecting a socket.
 * The socket triggers a route lookup which reveals the local address.
 * No data is actually sent to the remote host.
 */
export async function getLocalIpAddress(): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = TcpSocket.createConnection(
      {
        port: 80,
        host: "8.8.8.8", // Any routable address — no data is sent
        interface: "wifi",
        connectTimeout: 3000,
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
      reject(new Error("Could not determine local IP address"));
    });
  });
}
