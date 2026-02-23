export interface OfferMessage {
  type: "offer";
  sdp: string;
}

export interface AnswerMessage {
  type: "answer";
  sdp: string;
}

export interface IceCandidateMessage {
  type: "ice-candidate";
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface ByeMessage {
  type: "bye";
}

export type SignalingMessage =
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | ByeMessage;
