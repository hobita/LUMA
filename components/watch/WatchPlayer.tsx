"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Tv,
  Sparkles,
  Film,
  Compass,
  ExternalLink,
  Search,
  FolderUp,
  MonitorUp,
} from "lucide-react";

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

export interface LocalMediaInfo {
  url: string;
  name: string;
  type: string;
}

interface WatchPlayerProps {
  videoId: string | null;
  videoTitle: string;
  localMedia?: LocalMediaInfo | null;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onClose: () => void;
  onSelectVideo: (videoId: string, title: string) => void;
  onSelectLocalFile?: (file: File) => void;
  onOpenYouTubeBrowser?: () => void;
  onTriggerScreenShare?: () => void;
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
    id: "ufskJSgaLfI",
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
  localMedia,
  onPlay,
  onPause,
  onSeek,
  onClose,
  onSelectVideo,
  onSelectLocalFile,
  onOpenYouTubeBrowser,
  onTriggerScreenShare,
  registerPlayer,
}: WatchPlayerProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(!videoId && !localMedia);
  const playerRef = useRef<YTPlayer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  // Register HTML5 local video controller
  useEffect(() => {
    if (localMedia) {
      registerPlayer({
        play: () => {
          localVideoRef.current?.play().catch(() => {});
        },
        pause: () => {
          localVideoRef.current?.pause();
        },
        seekTo: (seconds: number) => {
          if (localVideoRef.current) {
            localVideoRef.current.currentTime = seconds;
          }
        },
        getCurrentTime: () => localVideoRef.current?.currentTime || 0,
      });
    }
  }, [localMedia, registerPlayer]);

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
      onSelectVideo(id, "Custom Video");
      setCustomUrl("");
      setPickerOpen(false);
    }
  }

  function handleLocalFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0 && onSelectLocalFile) {
      onSelectLocalFile(files[0]);
      setPickerOpen(false);
    }
  }

  // Initialize YouTube Iframe API when videoId is present and not local
  useEffect(() => {
    if (!videoId || videoId === "local") return;

    let isMounted = true;

    function initPlayer() {
      if (!window.YT || !window.YT.Player) {
        if (!document.getElementById("youtube-iframe-script")) {
          const tag = document.createElement("script");
          tag.id = "youtube-iframe-script";
          tag.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = () => {
          if (isMounted) initPlayer();
        };
        return;
      }

      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player("luma-youtube-player", {
        videoId: videoId!,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;

            registerPlayer({
              play: () => event.target.playVideo(),
              pause: () => event.target.pauseVideo(),
              seekTo: (seconds: number) => event.target.seekTo(seconds, true),
              getCurrentTime: () => event.target.getCurrentTime(),
            });
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            const state = event.data;
            const currentTime = event.target.getCurrentTime();

            if (state === window.YT.PlayerState.PLAYING) {
              onPlay(currentTime);
            } else if (state === window.YT.PlayerState.PAUSED) {
              onPause(currentTime);
            }
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
      {/* Hidden File Picker Input */}
      <input
        ref={localFileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleLocalFileChange}
        className="hidden"
      />

      {/* Top Cinema Bar */}
      <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between z-20 bg-[#12121A]/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            {localMedia ? <FolderUp className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate max-w-sm">
              {localMedia?.name || videoTitle || "Watch Together"}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {localMedia ? "Local File • Realtime Synchronized" : "Realtime Playback Synchronized"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Upload / Switch Local Media */}
          {onSelectLocalFile && (
            <button
              onClick={() => localFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs text-purple-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Upload / Change Local Media"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Media</span>
            </button>
          )}

          {/* YouTube Search Button */}
          {onOpenYouTubeBrowser && (
            <button
              onClick={onOpenYouTubeBrowser}
              className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-xs text-red-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Search Songs & Videos on YouTube"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">YouTube</span>
            </button>
          )}

          {/* Change Video / Picker Toggle */}
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs text-purple-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5" />
            <span>{pickerOpen ? "Hide" : "Media Menu"}</span>
          </button>

          {/* Close Cinema Mode */}
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
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {localMedia?.url ? (
          /* HTML5 Video Player for Local Device Uploads */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={localVideoRef}
              src={localMedia.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onPlay={() => {
                if (localVideoRef.current) {
                  onPlay(localVideoRef.current.currentTime);
                }
              }}
              onPause={() => {
                if (localVideoRef.current) {
                  onPause(localVideoRef.current.currentTime);
                }
              }}
              onSeeked={() => {
                if (localVideoRef.current) {
                  onSeek(localVideoRef.current.currentTime);
                }
              }}
            />
          </div>
        ) : videoId && videoId !== "local" ? (
          /* YouTube Player */
          <div id="luma-youtube-player" className="w-full h-full" />
        ) : videoId === "local" ? (
          /* Partner broadcasted local video, but current client hasn't picked their file */
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-300 shadow-xl shadow-purple-900/30">
              <FolderUp className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white">Partner is playing a local video</h3>
            <p className="text-xs text-zinc-400 mt-1.5 mb-6 leading-relaxed">
              {videoTitle ? `"${videoTitle}"` : "A media file from their device"}. Select your copy to watch in synchronized full HD, or ask them to screen share.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => localFileInputRef.current?.click()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
              >
                <FolderUp className="w-4 h-4" />
                <span>Select My Copy</span>
              </button>
              {onTriggerScreenShare && (
                <button
                  onClick={onTriggerScreenShare}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <MonitorUp className="w-4 h-4 text-purple-400" />
                  <span>Screen Share</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty Stage */
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <Sparkles className="w-10 h-10 text-purple-400 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Choose something to watch together</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Search YouTube songs or choose a video from your device to watch together.
            </p>
          </div>
        )}

        {/* Video Picker Overlay */}
        {pickerOpen && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Quick Actions Row: YouTube Search + Device Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {/* YouTube Search Card */}
                {onOpenYouTubeBrowser && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/20 to-rose-600/10 border border-red-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center">
                        <Search className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">YouTube Search</h4>
                        <p className="text-[11px] text-zinc-400">Songs, videos, playlists</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPickerOpen(false);
                        onOpenYouTubeBrowser();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-all shadow-lg shadow-red-900/30 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </div>
                )}

                {/* Local Media Upload Card */}
                {onSelectLocalFile && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-indigo-600/10 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                        <FolderUp className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Device Media</h4>
                        <p className="text-[11px] text-zinc-400">MP4, WebM, MOV, MP3</p>
                      </div>
                    </div>
                    <button
                      onClick={() => localFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-all shadow-lg shadow-purple-900/30 flex items-center gap-1.5"
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">Cozy Picks for Couples</span>
                </div>
                {(videoId || localMedia) && (
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
