"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Radio,
  Volume2,
  VolumeX,
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
  remoteMovieStream?: MediaStream | null;
  remoteMovieTitle?: string | null;
  isMovieStreaming?: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onClose: () => void;
  onSelectVideo: (videoId: string, title: string) => void;
  onSelectLocalFile?: (file: File) => void;
  onOpenYouTubeBrowser?: () => void;
  onTriggerScreenShare?: () => void;
  onStartMovieStream?: (stream: MediaStream, title: string) => void;
  onStopMovieStream?: () => void;
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
  remoteMovieStream,
  remoteMovieTitle,
  isMovieStreaming,
  onPlay,
  onPause,
  onSeek,
  onClose,
  onSelectVideo,
  onSelectLocalFile,
  onOpenYouTubeBrowser,
  onTriggerScreenShare,
  onStartMovieStream,
  onStopMovieStream,
  registerPlayer,
}: WatchPlayerProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(!videoId && !localMedia && !remoteMovieStream);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteMovieVideoRef = useRef<HTMLVideoElement | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  // Capture host's local video stream and broadcast to partner via WebRTC
  useEffect(() => {
    if (!localMedia || !onStartMovieStream) return;

    let isCancelled = false;
    let streamCaptured: MediaStream | null = null;

    function attemptCapture() {
      const videoEl = localVideoRef.current;
      if (!videoEl || isCancelled) return;

      try {
        let stream: MediaStream | null = null;
        if (typeof (videoEl as any).captureStream === "function") {
          stream = (videoEl as any).captureStream();
        } else if (typeof (videoEl as any).mozCaptureStream === "function") {
          stream = (videoEl as any).mozCaptureStream();
        }

        if (stream && stream.getVideoTracks().length > 0) {
          streamCaptured = stream;
          if (onStartMovieStream) {
            onStartMovieStream(stream, localMedia?.name || "Shared Film");
          }
        }
      } catch (err) {
        console.warn("Could not capture video stream for partner:", err);
      }
    }

    const videoEl = localVideoRef.current;
    if (videoEl) {
      if (videoEl.readyState >= 1) {
        attemptCapture();
      } else {
        videoEl.addEventListener("loadedmetadata", attemptCapture, { once: true });
        videoEl.addEventListener("canplay", attemptCapture, { once: true });
      }
    }

    return () => {
      isCancelled = true;
      if (onStopMovieStream) {
        onStopMovieStream();
      }
      if (streamCaptured) {
        streamCaptured.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localMedia, onStartMovieStream, onStopMovieStream]);

  // Callback ref for remote movie stream player (partner)
  const remoteMovieVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteMovieVideoRef.current = el;
      if (el && remoteMovieStream) {
        el.srcObject = remoteMovieStream;
        el.play().catch(() => {
          // Autoplay with audio was blocked by browser policy without user gesture
          setAudioBlocked(true);
        });
      }
    },
    [remoteMovieStream]
  );

  // Register HTML5 local video controller for Host
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

  // Register remote movie stream controller for Partner
  useEffect(() => {
    if (remoteMovieStream && !localMedia) {
      registerPlayer({
        play: () => {
          remoteMovieVideoRef.current?.play().catch(() => {});
        },
        pause: () => {
          remoteMovieVideoRef.current?.pause();
        },
        seekTo: (seconds: number) => {
          if (remoteMovieVideoRef.current) {
            remoteMovieVideoRef.current.currentTime = seconds;
          }
        },
        getCurrentTime: () => remoteMovieVideoRef.current?.currentTime || 0,
      });
    }
  }, [remoteMovieStream, localMedia, registerPlayer]);

  // Handle unmute click if browser blocked autoplay with sound
  function handleUnmuteClick() {
    if (remoteMovieVideoRef.current) {
      remoteMovieVideoRef.current.muted = false;
      remoteMovieVideoRef.current.play().catch(() => {});
      setAudioBlocked(false);
    }
  }

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
            {localMedia || remoteMovieStream ? (
              <Film className="w-4 h-4 text-rose-400" />
            ) : (
              <Tv className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate max-w-sm">
              {localMedia?.name ||
                remoteMovieTitle ||
                (videoId === "local" ? videoTitle : null) ||
                videoTitle ||
                "Watch Together"}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {localMedia
                  ? isMovieStreaming
                    ? "📡 Live HD Cinema • Streaming to Partner"
                    : "Local File • Direct Playback"
                  : remoteMovieStream
                  ? "🎬 Live Cinema Stream • From Partner's Device"
                  : videoId === "local"
                  ? "Connecting to Partner's Stream..."
                  : "Realtime Playback Synchronized"}
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
              title="Upload / Change Film"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Film</span>
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
          /* HTML5 Video Player for Local Device Uploads (Host Side) */
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
            {/* Live Streaming Badge on Host Player */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/30 text-xs text-purple-200 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-white">Live Broadcast</span>
              <span className="text-zinc-400">• Partner is Watching</span>
            </div>
          </div>
        ) : remoteMovieStream ? (
          /* Live WebRTC Cinema Player for Partner (No File Needed on Partner Device!) */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={remoteMovieVideoCallbackRef}
              autoPlay
              playsInline
              controls
              className="w-full h-full object-contain"
              onPlay={() => {
                if (remoteMovieVideoRef.current) {
                  onPlay(remoteMovieVideoRef.current.currentTime);
                }
              }}
              onPause={() => {
                if (remoteMovieVideoRef.current) {
                  onPause(remoteMovieVideoRef.current.currentTime);
                }
              }}
              onSeeked={() => {
                if (remoteMovieVideoRef.current) {
                  onSeek(remoteMovieVideoRef.current.currentTime);
                }
              }}
            />

            {/* Live Cinema Badge */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-rose-500/30 text-xs text-rose-200 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-medium text-white">Live Cinema Stream</span>
              <span className="text-zinc-400">• From Partner&apos;s Device</span>
            </div>

            {/* Autoplay Sound Prompt if blocked by browser policy */}
            {audioBlocked && (
              <button
                onClick={handleUnmuteClick}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-bounce"
              >
                <Volume2 className="w-4 h-4 text-emerald-300" />
                <span>Click to Enable Theater Sound</span>
              </button>
            )}
          </div>
        ) : videoId && videoId !== "local" ? (
          /* YouTube Player */
          <div id="luma-youtube-player" className="w-full h-full" />
        ) : videoId === "local" ? (
          /* Partner broadcasted local video, and movie stream is negotiating */
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-rose-600/30 border border-purple-500/40 flex items-center justify-center mb-5 text-purple-300 shadow-2xl shadow-purple-900/40 relative">
              <Film className="w-10 h-10 text-rose-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">Connecting to Partner&apos;s Cinema Stream</h3>
            <p className="text-xs text-zinc-400 mt-2 mb-6 leading-relaxed max-w-sm">
              Your partner is streaming{" "}
              <span className="text-purple-300 font-medium">
                {videoTitle ? `"${videoTitle}"` : "a film"}
              </span>{" "}
              from their device. You will see and hear it in full HD in a few seconds.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs shadow-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Securing Encrypted P2P Movie Stream...</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => localFileInputRef.current?.click()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <FolderUp className="w-4 h-4 text-purple-400" />
                <span>Select My Copy Instead</span>
              </button>
              {onTriggerScreenShare && (
                <button
                  onClick={onTriggerScreenShare}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <MonitorUp className="w-4 h-4 text-rose-400" />
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
              Search YouTube songs or upload a film from your device to watch together.
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
