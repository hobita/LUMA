"use client";

import { useEffect, useRef, useState } from "react";
import { X, Tv, Sparkles, Film, Compass, ExternalLink } from "lucide-react";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

interface WatchPlayerProps {
  videoId: string | null;
  videoTitle: string;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onClose: () => void;
  onSelectVideo: (videoId: string, title: string) => void;
  registerPlayer: (controller: {
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => void;
    getCurrentTime: () => number;
  }) => void;
}

// Curated cozy presets for long-distance couples (evergreen uploads)
const COZY_PRESETS = [
  {
    id: "L_LUpnjgPso",
    title: "Cozy Fireplace with Soft Acoustic Guitar",
    tag: "Warm Ambiance",
  },
  {
    id: "7OGiK9Xn_r4",
    title: "Rainy Night in Tokyo — Relaxing Ambient Walking Tour",
    tag: "Romantic Walk",
  },
  {
    id: "5qap5aO4i9A",
    title: "Lofi Hip Hop Radio — Beats to Relax/Study to",
    tag: "Cozy Study",
  },
];

export function WatchPlayer({
  videoId,
  videoTitle,
  onPlay,
  onPause,
  onClose,
  onSelectVideo,
  registerPlayer,
}: WatchPlayerProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(!videoId);
  const playerRef = useRef<YTPlayer | null>(null);

  // Parse YouTube URL to Video ID
  function extractYouTubeId(url: string): string | null {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    const match = trimmed.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = extractYouTubeId(customUrl);
    if (id) {
      onSelectVideo(id, "Shared YouTube Video");
      setCustomUrl("");
      setPickerOpen(false);
    }
  }

  // Load YouTube IFrame API Script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YT Player when videoId changes
  useEffect(() => {
    if (!videoId) return;
    const currentVideoId = videoId;

    let isMounted = true;

    function initPlayer() {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      if (playerRef.current) {
        playerRef.current.destroy();
      }

      new window.YT.Player("luma-youtube-player", {
        videoId: currentVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            playerRef.current = event.target;
            registerPlayer({
              play: () => playerRef.current?.playVideo(),
              pause: () => playerRef.current?.pauseVideo(),
              seekTo: (sec) => playerRef.current?.seekTo(sec, true),
              getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
            });
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              onPlay(event.target.getCurrentTime());
            } else if (state === window.YT.PlayerState.PAUSED) {
              onPause(event.target.getCurrentTime());
            }
          },
          onError: () => {
            if (!isMounted) return;
            setPickerOpen(true);
          },
        },
      });
    }

    initPlayer();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, onPlay, onPause, registerPlayer]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-black/90 shadow-2xl">
      {/* Top Cinema Bar */}
      <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between z-20 bg-[#12121A]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white truncate max-w-sm">
              {videoTitle || "Watch Together"}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Playback Synchronized</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs text-purple-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5" />
            <span>{pickerOpen ? "Hide Picker" : "Change Video"}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Exit Cinema Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Display Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black">
        {videoId ? (
          <div id="luma-youtube-player" className="w-full h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <Sparkles className="w-10 h-10 text-purple-400 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Choose something to watch together</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Select one of the cozy curated streams below or paste any public YouTube link.
            </p>
          </div>
        )}

        {/* Video Picker Overlay */}
        {pickerOpen && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">Cozy Recommendations</span>
                </div>
                {videoId && (
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Presets Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {COZY_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectVideo(item.id, item.title);
                      setPickerOpen(false);
                    }}
                    className="p-4 rounded-2xl glass-panel hover:border-purple-500/40 text-left transition-all group hover:scale-[1.02]"
                  >
                    <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">
                      {item.tag}
                    </span>
                    <h4 className="text-xs font-medium text-white mt-1 group-hover:text-purple-200 line-clamp-2">
                      {item.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <form onSubmit={handleCustomSubmit} className="mt-6 pt-4 border-t border-white/[0.08]">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Paste any YouTube URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  <span>Load</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
