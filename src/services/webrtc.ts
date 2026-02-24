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
 * ICE candidates are sent as they are gathered.
 */
export function createSenderPeerConnection(
  localStream: MediaStream,
  send: SendMessage,
  onConnectionStateChange: OnConnectionStateChange,
): WebRTCHandle {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  // Add local tracks to the connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Send ICE candidates to the receiver as they are gathered
  (pc as any).addEventListener("icecandidate", (event: any) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? null,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
      });
    }
  });

  (pc as any).addEventListener("connectionstatechange", () => {
    onConnectionStateChange(pc.connectionState);
  });

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
    }
  })();

  async function handleSignalingMessage(message: SignalingMessage) {
    try {
      switch (message.type) {
        case "answer":
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: message.sdp })
          );
          break;
        case "ice-candidate":
          await pc.addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.sdpMid,
              sdpMLineIndex: message.sdpMLineIndex,
            })
          );
          break;
        case "bye":
          pc.close();
          break;
      }
    } catch (err) {
      console.error("WebRTC sender: error handling message:", message.type, err);
    }
  }

  return {
    pc,
    handleSignalingMessage,
    close() {
      pc.close();
    },
  };
}

/**
 * Create a WebRTC peer connection for the Receiver (callee).
 * Waits for an offer, creates an answer, and renders the remote stream.
 * ICE candidates are sent as they are gathered.
 */
export function createReceiverPeerConnection(
  send: SendMessage,
  onRemoteStream: OnRemoteStream,
  onConnectionStateChange: OnConnectionStateChange,
): WebRTCHandle {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  // Send ICE candidates to the sender as they are gathered
  (pc as any).addEventListener("icecandidate", (event: any) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? null,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
      });
    }
  });

  // Receive remote tracks
  (pc as any).addEventListener("track", (event: any) => {
    if (event.streams && event.streams.length > 0) {
      onRemoteStream(event.streams[0]);
    }
  });

  (pc as any).addEventListener("connectionstatechange", () => {
    onConnectionStateChange(pc.connectionState);
  });

  async function handleSignalingMessage(message: SignalingMessage) {
    try {
      switch (message.type) {
        case "offer":
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: message.sdp })
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({
            type: "answer",
            sdp: answer.sdp,
          });
          break;
        case "ice-candidate":
          await pc.addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.sdpMid,
              sdpMLineIndex: message.sdpMLineIndex,
            })
          );
          break;
        case "bye":
          pc.close();
          break;
      }
    } catch (err) {
      console.error("WebRTC receiver: error handling message:", message.type, err);
    }
  }

  return {
    pc,
    handleSignalingMessage,
    close() {
      send({ type: "bye" });
      pc.close();
    },
  };
}
