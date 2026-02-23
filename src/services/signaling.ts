import TcpSocket from "react-native-tcp-socket";
import type { SignalingMessage } from "../types/signaling";
import { SIGNALING_PORT } from "../constants/network";

type MessageHandler = (message: SignalingMessage) => void;
type StatusHandler = (status: "listening" | "connected" | "disconnected" | "error", error?: string) => void;

interface SignalingServer {
  close: () => void;
}

interface SignalingClient {
  send: (message: SignalingMessage) => void;
  close: () => void;
}

/**
 * Parse newline-delimited JSON from a TCP data buffer.
 * Handles partial messages by maintaining a buffer string.
 */
function createMessageParser(onMessage: MessageHandler) {
  let buffer = "";

  return (data: Buffer | string) => {
    buffer += typeof data === "string" ? data : data.toString("utf-8");

    const lines = buffer.split("\n");
    // Last element is either empty (if buffer ended with \n) or a partial message
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as SignalingMessage;
        onMessage(msg);
      } catch {
        console.warn("Signaling: failed to parse message:", trimmed);
      }
    }
  };
}

/**
 * Start a TCP signaling server (used by the Sender).
 * Accepts one client connection at a time.
 * Returns a handle to send messages and close the server.
 */
export function startSignalingServer(
  onMessage: MessageHandler,
  onStatus: StatusHandler,
): SignalingServer & SignalingClient {
  let clientSocket: InstanceType<typeof TcpSocket.Socket> | null = null;
  let serverClosed = false;

  const server = TcpSocket.createServer((socket) => {
    if (clientSocket) {
      // Only allow one client at a time
      socket.destroy();
      return;
    }

    clientSocket = socket;
    socket.setEncoding("utf-8");
    socket.setNoDelay(true);

    const parse = createMessageParser(onMessage);

    socket.on("data", parse);

    socket.on("close", () => {
      clientSocket = null;
      if (!serverClosed) {
        onStatus("disconnected");
      }
    });

    socket.on("error", (err) => {
      console.error("Signaling server socket error:", err);
      clientSocket = null;
      if (!serverClosed) {
        onStatus("error", err.message);
      }
    });

    onStatus("connected");
  });

  server.on("error", (err) => {
    console.error("Signaling server error:", err);
    onStatus("error", err.message);
  });

  server.listen(
    { port: SIGNALING_PORT, host: "0.0.0.0", reuseAddress: true },
    () => {
      onStatus("listening");
    }
  );

  return {
    send(message: SignalingMessage) {
      if (clientSocket && !clientSocket.destroyed) {
        clientSocket.write(JSON.stringify(message) + "\n");
      }
    },
    close() {
      serverClosed = true;
      if (clientSocket && !clientSocket.destroyed) {
        clientSocket.destroy();
        clientSocket = null;
      }
      server.close();
    },
  };
}

/**
 * Connect to a TCP signaling server (used by the Receiver).
 * Returns a handle to send messages and close the connection.
 */
export function connectToSignalingServer(
  host: string,
  onMessage: MessageHandler,
  onStatus: StatusHandler,
): SignalingClient {
  let closed = false;

  const socket = TcpSocket.createConnection(
    {
      port: SIGNALING_PORT,
      host,
      interface: "wifi",
      connectTimeout: 10000,
    },
    () => {
      if (!closed) {
        onStatus("connected");
      }
    }
  );

  socket.setEncoding("utf-8");
  socket.setNoDelay(true);

  const parse = createMessageParser(onMessage);

  socket.on("data", parse);

  socket.on("close", () => {
    if (!closed) {
      onStatus("disconnected");
    }
  });

  socket.on("error", (err) => {
    console.error("Signaling client error:", err);
    if (!closed) {
      onStatus("error", err.message);
    }
  });

  return {
    send(message: SignalingMessage) {
      if (!socket.destroyed) {
        socket.write(JSON.stringify(message) + "\n");
      }
    },
    close() {
      closed = true;
      if (!socket.destroyed) {
        socket.destroy();
      }
    },
  };
}
