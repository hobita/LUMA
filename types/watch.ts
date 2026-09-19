export type WatchEventType = "PLAY" | "PAUSE" | "SEEK" | "LOAD_VIDEO" | "CLOSE_WATCH";

export interface WatchEventPayload {
  type: WatchEventType;
  senderId: string;
  videoId?: string;
  currentTime?: number;
  title?: string;
}

export interface WatchState {
  isActive: boolean;
  videoId: string | null;
  videoTitle: string;
  isPlaying: boolean;
  currentTime: number;
}
