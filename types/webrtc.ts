export type SignalingMessageType =
  | "offer"
  | "answer"
  | "candidate"
  | "media_state"
  | "peer_ready";

export interface SignalingPayload {
  type: SignalingMessageType;
  senderId: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  mediaState?: {
    micActive: boolean;
    videoActive: boolean;
    screenSharing: boolean;
  };
}

export type WebRTCConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";
