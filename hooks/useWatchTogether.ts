"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { WatchEventPayload, WatchState } from "@/types/watch";

export function useWatchTogether(slug: string, currentUserId: string) {
  const [watchState, setWatchState] = useState<WatchState>({
    isActive: false,
    activeMode: null,
    videoId: null,
    videoTitle: "",
    isPlaying: false,
    currentTime: 0,
    gameType: null,
    gameTitle: "",
  });

  const [lastRemoteGameMove, setLastRemoteGameMove] = useState<{
    action: string;
    data: Record<string, unknown>;
  } | null>(null);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  // Flag to suppress echo / infinite loop when responding to remote player events
  const isRemoteActionRef = useRef(false);

  // Callback registered by YouTube player component
  const playerControllerRef = useRef<{
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => void;
    getCurrentTime: () => number;
  } | null>(null);

  // Broadcast helper
  const broadcastWatchEvent = useCallback(
    (payload: WatchEventPayload) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "WATCH_EVENT",
          payload,
        });
      }

      // Local tab fallback
      if (typeof window !== "undefined" && window.BroadcastChannel) {
        const bc = new BroadcastChannel(`luma-watch-${slug}`);
        bc.postMessage(payload);
        bc.close();
      }
    },
    [slug]
  );

  // Handle incoming watch event from partner
  const handleIncomingEvent = useCallback((payload: WatchEventPayload) => {
    if (!payload || payload.senderId === currentUserId) return;

    isRemoteActionRef.current = true;
    setTimeout(() => {
      isRemoteActionRef.current = false;
    }, 1000);

    switch (payload.type) {
      case "LOAD_VIDEO":
        setWatchState({
          isActive: true,
          activeMode: "video",
          videoId: payload.videoId || null,
          videoTitle: payload.title || "Shared Video",
          isPlaying: false,
          currentTime: 0,
          gameType: null,
          gameTitle: "",
        });
        break;

      case "LOAD_GAME":
        setWatchState({
          isActive: true,
          activeMode: "game",
          videoId: null,
          videoTitle: "",
          isPlaying: false,
          currentTime: 0,
          gameType: payload.gameType || "heart_tac_toe",
          gameTitle: payload.title || "Couple Game",
        });
        break;

      case "GAME_MOVE":
        if (payload.gameMove) {
          setLastRemoteGameMove(payload.gameMove);
        }
        break;

      case "PLAY":
        setWatchState((prev) => ({
          ...prev,
          isPlaying: true,
          currentTime: payload.currentTime ?? prev.currentTime,
        }));
        if (playerControllerRef.current) {
          if (payload.currentTime !== undefined) {
            const current = playerControllerRef.current.getCurrentTime();
            if (Math.abs(current - payload.currentTime) > 1.5) {
              playerControllerRef.current.seekTo(payload.currentTime);
            }
          }
          playerControllerRef.current.play();
        }
        break;

      case "PAUSE":
        setWatchState((prev) => ({
          ...prev,
          isPlaying: false,
          currentTime: payload.currentTime ?? prev.currentTime,
        }));
        if (playerControllerRef.current) {
          if (payload.currentTime !== undefined) {
            playerControllerRef.current.seekTo(payload.currentTime);
          }
          playerControllerRef.current.pause();
        }
        break;

      case "SEEK":
        if (payload.currentTime !== undefined) {
          setWatchState((prev) => ({
            ...prev,
            currentTime: payload.currentTime!,
          }));
          if (playerControllerRef.current) {
            playerControllerRef.current.seekTo(payload.currentTime);
          }
        }
        break;

      case "CLOSE_WATCH":
      case "CLOSE_GAME":
        setWatchState({
          isActive: false,
          activeMode: null,
          videoId: null,
          videoTitle: "",
          isPlaying: false,
          currentTime: 0,
          gameType: null,
          gameTitle: "",
        });
        break;
    }
  }, [currentUserId]);

  // Subscribe to Realtime channel
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase.channel(`room:${slug}:watch`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "WATCH_EVENT" }, ({ payload }) => {
        handleIncomingEvent(payload as WatchEventPayload);
      })
      .subscribe();

    let localBc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      localBc = new BroadcastChannel(`luma-watch-${slug}`);
      localBc.onmessage = (e) => {
        handleIncomingEvent(e.data as WatchEventPayload);
      };
    }

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      localBc?.close();
    };
  }, [slug, handleIncomingEvent]);

  // User Actions to trigger
  const loadVideo = useCallback(
    (videoId: string, title = "Shared Video") => {
      setWatchState({
        isActive: true,
        activeMode: "video",
        videoId,
        videoTitle: title,
        isPlaying: false,
        currentTime: 0,
        gameType: null,
        gameTitle: "",
      });

      broadcastWatchEvent({
        type: "LOAD_VIDEO",
        senderId: currentUserId,
        videoId,
        title,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const loadGame = useCallback(
    (gameType: "heart_tac_toe" | "connect_four" | "deep_talk", title = "Couple Game") => {
      setWatchState({
        isActive: true,
        activeMode: "game",
        videoId: null,
        videoTitle: "",
        isPlaying: false,
        currentTime: 0,
        gameType,
        gameTitle: title,
      });

      broadcastWatchEvent({
        type: "LOAD_GAME",
        senderId: currentUserId,
        gameType,
        title,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const sendGameMove = useCallback(
    (gameMove: { action: string; data: Record<string, unknown> }) => {
      broadcastWatchEvent({
        type: "GAME_MOVE",
        senderId: currentUserId,
        gameMove,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const syncPlay = useCallback(
    (time: number) => {
      if (isRemoteActionRef.current) return;
      setWatchState((prev) => ({ ...prev, isPlaying: true, currentTime: time }));
      broadcastWatchEvent({
        type: "PLAY",
        senderId: currentUserId,
        currentTime: time,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const syncPause = useCallback(
    (time: number) => {
      if (isRemoteActionRef.current) return;
      setWatchState((prev) => ({ ...prev, isPlaying: false, currentTime: time }));
      broadcastWatchEvent({
        type: "PAUSE",
        senderId: currentUserId,
        currentTime: time,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const syncSeek = useCallback(
    (time: number) => {
      if (isRemoteActionRef.current) return;
      setWatchState((prev) => ({ ...prev, currentTime: time }));
      broadcastWatchEvent({
        type: "SEEK",
        senderId: currentUserId,
        currentTime: time,
      });
    },
    [broadcastWatchEvent, currentUserId]
  );

  const closeWatch = useCallback(() => {
    setWatchState({
      isActive: false,
      activeMode: null,
      videoId: null,
      videoTitle: "",
      isPlaying: false,
      currentTime: 0,
      gameType: null,
      gameTitle: "",
    });
    broadcastWatchEvent({
      type: "CLOSE_WATCH",
      senderId: currentUserId,
    });
  }, [broadcastWatchEvent, currentUserId]);

  const registerPlayer = useCallback(
    (controller: {
      play: () => void;
      pause: () => void;
      seekTo: (seconds: number) => void;
      getCurrentTime: () => number;
    }) => {
      playerControllerRef.current = controller;
    },
    []
  );

  return {
    watchState,
    loadVideo,
    loadGame,
    sendGameMove,
    lastRemoteGameMove,
    syncPlay,
    syncPause,
    syncSeek,
    closeWatch,
    registerPlayer,
  };
}
