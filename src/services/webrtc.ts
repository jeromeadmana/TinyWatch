import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from "react-native-webrtc";
import { RTC_CONFIG } from "../constants/webrtc";
import type { SignalingMessage } from "../types/signaling";

type SendMessage = (message: SignalingMessage) => void;
type OnRemoteStream = (stream: MediaStream) => void;
type OnConnectionStateChange = (state: string) => void;

interface WebRTCHandle {
  pc: RTCPeerConnection;
  handleSignalingMessage: (message: SignalingMessage) => Promise<void>;
  close: () => void;
}

/**
 * Create a WebRTC peer connection for the Sender (caller).
 * Adds local media tracks, creates an offer, and sends it via signaling.
 * ICE candidates are buffered until the remote description is set.
 */
export function createSenderPeerConnection(
  localStream: MediaStream,
  send: SendMessage,
  onConnectionStateChange: OnConnectionStateChange,
): WebRTCHandle {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  let remoteDescSet = false;
  let closed = false;
  let iceRetryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  const MAX_ICE_RETRIES = 3;
  const ICE_RETRY_DELAY_MS = 2000;
  const pendingCandidates: RTCIceCandidate[] = [];

  // Add local tracks to the connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Send ICE candidates to the receiver as they are gathered
  const onIce = (event: any) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? null,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
      });
    }
  };

  async function attemptIceRestart() {
    if (closed) return;
    try {
      console.log(`WebRTC: ICE restart attempt ${iceRetryCount}/${MAX_ICE_RETRIES}`);
      const offer = await pc.createOffer({ iceRestart: true } as any);
      await pc.setLocalDescription(offer);
      remoteDescSet = false;
      pendingCandidates.length = 0;
      send({ type: "offer", sdp: offer.sdp });
    } catch (err) {
      console.error("WebRTC: ICE restart failed:", err);
      onConnectionStateChange("failed");
    }
  }

  const onConnState = () => {
    const state = pc.connectionState;
    if (state === "connected") {
      iceRetryCount = 0;
    }
    if (state === "failed" && iceRetryCount < MAX_ICE_RETRIES && !closed) {
      iceRetryCount++;
      onConnectionStateChange("connecting");
      retryTimer = setTimeout(() => attemptIceRestart(), ICE_RETRY_DELAY_MS);
      return;
    }
    onConnectionStateChange(state);
  };

  (pc as any).addEventListener("icecandidate", onIce);
  (pc as any).addEventListener("connectionstatechange", onConnState);

  // Create and send the offer
  (async () => {
    try {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      send({
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (err) {
      console.error("WebRTC: failed to create offer:", err);
      onConnectionStateChange("failed");
    }
  })();

  async function handleSignalingMessage(message: SignalingMessage) {
    try {
      switch (message.type) {
        case "answer":
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: message.sdp })
          );
          remoteDescSet = true;
          for (const c of pendingCandidates) {
            await pc.addIceCandidate(c);
          }
          pendingCandidates.length = 0;
          break;
        case "ice-candidate": {
          const candidate = new RTCIceCandidate({
            candidate: message.candidate,
            sdpMid: message.sdpMid,
            sdpMLineIndex: message.sdpMLineIndex,
          });
          if (remoteDescSet) {
            await pc.addIceCandidate(candidate);
          } else {
            pendingCandidates.push(candidate);
          }
          break;
        }
        case "bye":
          cleanup();
          break;
      }
    } catch (err) {
      console.error("WebRTC sender: error handling message:", message.type, err);
    }
  }

  function cleanup() {
    if (closed) return;
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    (pc as any).removeEventListener("icecandidate", onIce);
    (pc as any).removeEventListener("connectionstatechange", onConnState);
    pc.close();
  }

  return {
    pc,
    handleSignalingMessage,
    close() {
      if (!closed) {
        send({ type: "bye" });
      }
      cleanup();
    },
  };
}

/**
 * Create a WebRTC peer connection for the Receiver (callee).
 * Waits for an offer, creates an answer, and renders the remote stream.
 * ICE candidates are buffered until the remote description is set.
 */
export function createReceiverPeerConnection(
  send: SendMessage,
  onRemoteStream: OnRemoteStream,
  onConnectionStateChange: OnConnectionStateChange,
): WebRTCHandle {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  let remoteDescSet = false;
  let closed = false;
  const pendingCandidates: RTCIceCandidate[] = [];

  // Send ICE candidates to the sender as they are gathered
  const onIce = (event: any) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? null,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
      });
    }
  };

  // Receive remote tracks
  const onTrack = (event: any) => {
    if (event.streams && event.streams.length > 0) {
      onRemoteStream(event.streams[0]);
    }
  };

  const onConnState = () => {
    onConnectionStateChange(pc.connectionState);
  };

  (pc as any).addEventListener("icecandidate", onIce);
  (pc as any).addEventListener("track", onTrack);
  (pc as any).addEventListener("connectionstatechange", onConnState);

  async function handleSignalingMessage(message: SignalingMessage) {
    try {
      switch (message.type) {
        case "offer":
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: message.sdp })
          );
          remoteDescSet = true;
          for (const c of pendingCandidates) {
            await pc.addIceCandidate(c);
          }
          pendingCandidates.length = 0;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({
            type: "answer",
            sdp: answer.sdp,
          });
          break;
        case "ice-candidate": {
          const candidate = new RTCIceCandidate({
            candidate: message.candidate,
            sdpMid: message.sdpMid,
            sdpMLineIndex: message.sdpMLineIndex,
          });
          if (remoteDescSet) {
            await pc.addIceCandidate(candidate);
          } else {
            pendingCandidates.push(candidate);
          }
          break;
        }
        case "bye":
          cleanup();
          break;
      }
    } catch (err) {
      console.error("WebRTC receiver: error handling message:", message.type, err);
    }
  }

  function cleanup() {
    if (closed) return;
    closed = true;
    (pc as any).removeEventListener("icecandidate", onIce);
    (pc as any).removeEventListener("track", onTrack);
    (pc as any).removeEventListener("connectionstatechange", onConnState);
    pc.close();
  }

  return {
    pc,
    handleSignalingMessage,
    close() {
      if (!closed) {
        send({ type: "bye" });
      }
      cleanup();
    },
  };
}
