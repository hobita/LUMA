export type SignalingMessageType =
  | "offer"
  | "answer"
  | "candidate"
  | "media_state"
  | "peer_ready"
  | "movie_stream_state";

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
  movieState?: {
    active: boolean;
    title: string;
    streamId: string;
  };
}

export type WebRTCConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";
