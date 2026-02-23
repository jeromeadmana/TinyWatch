import TcpSocket from "react-native-tcp-socket";
import type { SignalingMessage } from "../types/signaling";
import { SIGNALING_PORT, CONNECT_TIMEOUT_MS } from "../constants/network";

type MessageHandler = (message: SignalingMessage) => void;
type StatusHandler = (status: "listening" | "connected" | "disconnected" | "error", error?: string) => void;

interface SignalingServer {
  close: () => void;
}

interface SignalingClient {
  send: (message: SignalingMessage) => void;
  close: () => void;
}

const MAX_BUFFER_SIZE = 64 * 1024; // 64 KB — generous for signaling messages

/**
 * Parse newline-delimited JSON from a TCP data buffer.
 * Handles partial messages by maintaining a buffer string.
 */
function createMessageParser(onMessage: MessageHandler) {
  let buffer = "";

  return (data: Buffer | string) => {
    buffer += typeof data === "string" ? data : data.toString("utf-8");

    if (buffer.length > MAX_BUFFER_SIZE) {
      console.error("Signaling: message buffer exceeded maximum size, dropping");
      buffer = "";
      return;
    }

    const lines = buffer.split("\n");
    // Last element is either empty (if buffer ended with \n) or a partial message
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (isValidSignalingMessage(parsed)) {
          onMessage(parsed);
        } else {
          console.warn("Signaling: unknown message type:", parsed?.type);
        }
      } catch {
        console.warn("Signaling: failed to parse message:", trimmed);
      }
    }
  };
}

function isValidSignalingMessage(obj: unknown): obj is SignalingMessage {
  if (typeof obj !== "object" || obj === null) return false;
  const type = (obj as { type?: unknown }).type;
  return type === "offer" || type === "answer" || type === "ice-candidate" || type === "bye";
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

    socket.on("close", (hadError) => {
      clientSocket = null;
      if (!serverClosed && !hadError) {
        onStatus("disconnected");
      }
    });

    socket.on("error", (err) => {
      console.error("Signaling server socket error:", err);
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
      } else {
        console.warn("Signaling: cannot send, no client connected. Type:", message.type);
      }
    },
    close() {
      serverClosed = true;
      if (clientSocket && !clientSocket.destroyed) {
        clientSocket.destroy();
        clientSocket = null;
      }
      server.close((err) => {
        if (err) console.warn("Signaling server close error:", err.message);
      });
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
      connectTimeout: CONNECT_TIMEOUT_MS,
    },
    () => {
      if (!closed) {
        socket.setEncoding("utf-8");
        socket.setNoDelay(true);
        onStatus("connected");
      }
    }
  );

  const parse = createMessageParser(onMessage);

  socket.on("data", parse);

  socket.on("close", (hadError) => {
    if (!closed && !hadError) {
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
      } else {
        console.warn("Signaling: cannot send, socket destroyed. Type:", message.type);
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
