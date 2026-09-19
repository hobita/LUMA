export type WatchEventType =
  | "PLAY"
  | "PAUSE"
  | "SEEK"
  | "LOAD_VIDEO"
  | "CLOSE_WATCH"
  | "LOAD_GAME"
  | "GAME_MOVE"
  | "CLOSE_GAME";

export interface WatchEventPayload {
  type: WatchEventType;
  senderId: string;
  videoId?: string;
  currentTime?: number;
  title?: string;
  gameType?: "heart_tac_toe" | "connect_four" | "deep_talk" | "puzzle";
  gameMove?: { action: string; data: Record<string, unknown> };
}

export interface WatchState {
  isActive: boolean;
  activeMode: "video" | "game" | null;
  videoId: string | null;
  videoTitle: string;
  isPlaying: boolean;
  currentTime: number;
  gameType: "heart_tac_toe" | "connect_four" | "deep_talk" | "puzzle" | null;
  gameTitle: string;
}
