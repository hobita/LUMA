"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  MessageSquare,
  PhoneOff,
  Copy,
  Check,
  Heart,
  Sparkles,
  Users,
  MonitorUp,
  AlertCircle,
  Tv,
  Play,
} from "lucide-react";
import { Room, RoomRole } from "@/types/room";
import { usePresence } from "@/hooks/usePresence";
import { useChat } from "@/hooks/useChat";
import { useReactions } from "@/hooks/useReactions";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWatchTogether } from "@/hooks/useWatchTogether";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { FloatingReactions } from "@/components/reactions/FloatingReactions";
import { ReactionPicker } from "@/components/reactions/ReactionPicker";
import { WatchPlayer } from "@/components/watch/WatchPlayer";
import { MediaSelectorModal } from "@/components/media/MediaSelectorModal";
import { CoupleGames } from "@/components/games/CoupleGames";
import { YouTubeBrowser } from "@/components/media/YouTubeBrowser";

interface RoomClientProps {
  room: Room;
  userRole: RoomRole;
  currentUserId: string;
}

export function RoomClient({ room, userRole, currentUserId }: RoomClientProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [youtubeBrowserOpen, setYoutubeBrowserOpen] = useState(false);
  const [localMedia, setLocalMedia] = useState<{ url: string; name: string; type: string } | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function formatDuration(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  // 1. Realtime Presence
  const { partnerOnline } = usePresence(
    room.slug,
    currentUserId,
    userRole === "owner" ? "Host" : "Partner"
  );

  // 2. Realtime Chat
  const { messages, sendMessage } = useChat(
    room.slug,
    currentUserId,
    userRole === "owner" ? "Host" : "Partner"
  );

  // 3. Floating Reactions
  const { particles, sendReaction } = useReactions(room.slug);

  // 4. WebRTC Peer-to-Peer Media & Screen Sharing
  const {
    localVideoRef,
    remoteVideoRef,
    localDisplayStream,
    remoteDisplayStream,
    remoteScreenStream,
    remoteMovieStream,
    remoteMovieTitle,
    isMovieStreaming,
    connectionState,
    hasRemoteMedia,
    micActive,
    videoActive,
    screenSharing,
    remoteMediaState,
    mediaError,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    startMovieStream,
    stopMovieStream,
  } = useWebRTC({
    slug: room.slug,
    currentUserId,
    isOwner: userRole === "owner",
    partnerOnline,
  });

  // Callback refs: auto-bind srcObject when React re-creates video elements (cinema ⇄ standard)
  const localVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      if (el && localDisplayStream) {
        el.srcObject = localDisplayStream;
      }
    },
    [localVideoRef, localDisplayStream]
  );

  const remoteVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoRef.current = el;
      if (el && remoteDisplayStream) {
        el.srcObject = remoteDisplayStream;
      }
    },
    [remoteVideoRef, remoteDisplayStream]
  );

  // Remote screen share video callback ref
  const remoteScreenRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteScreenRef.current = el;
      if (el && remoteScreenStream) {
        el.srcObject = remoteScreenStream;
      }
    },
    [remoteScreenStream]
  );

  // 5. Watch Together Synchronized Media & Games
  const {
    watchState,
    loadVideo,
    loadLocalMedia,
    loadGame,
    sendGameMove,
    lastRemoteGameMove,
    syncPlay,
    syncPause,
    syncSeek,
    closeWatch,
    registerPlayer,
  } = useWatchTogether(room.slug, currentUserId);

  const handleSelectLocalMedia = useCallback(
    (file: File) => {
      if (localMedia?.url) {
        URL.revokeObjectURL(localMedia.url);
      }
      const url = URL.createObjectURL(file);
      setLocalMedia({ url, name: file.name, type: file.type });
      loadLocalMedia(file.name);
      setMediaModalOpen(false);
    },
    [localMedia, loadLocalMedia]
  );

  const handleCloseWatch = useCallback(() => {
    if (localMedia?.url) {
      URL.revokeObjectURL(localMedia.url);
    }
    setLocalMedia(null);
    stopMovieStream();
    closeWatch();
  }, [localMedia, closeWatch, stopMovieStream]);

  function copyInvite() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="relative h-screen w-screen flex flex-col justify-between bg-[#0B0B10] overflow-hidden text-white select-none">
      {/* Floating Animated Reactions */}
      <FloatingReactions particles={particles} />

      {/* Slide-over Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={sendMessage}
        currentUserId={currentUserId}
        partnerOnline={partnerOnline}
      />

      {/* Subtle ambient lighting */}
      <div className="pointer-events-none absolute top-10 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-rose-600/10 blur-[150px] rounded-full" />

      {/* Top Floating Dynamic Island Header */}
      <header className="relative z-20 w-full px-4 sm:px-8 pt-3 sm:pt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 rounded-full glass-island flex items-center justify-between shadow-2xl">
          {/* Left: Sanctuary Logo & Room Slug */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600/30 to-rose-600/30 border border-purple-500/40 flex items-center justify-center glow-rose group-hover:scale-105 transition-all">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/40 heart-beat" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white hidden sm:inline group-hover:text-purple-200 transition-colors">
                {room.name}
              </span>
            </Link>

            <div className="h-4 w-px bg-white/15 hidden sm:block" />

            {/* Room Code Badge with Copy Interaction */}
            <button
              onClick={copyInvite}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs transition-all group"
              title="Copy Invite Link"
            >
              <span className="font-mono text-zinc-300 group-hover:text-white font-medium">{room.slug}</span>
              {copied ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <Check className="w-3 h-3" />
                  <span className="hidden md:inline">Copied!</span>
                </span>
              ) : (
                <Copy className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>

          {/* Center: Call Duration Timer Capsule */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs text-zinc-300 font-medium shadow-inner">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-zinc-400 hidden md:inline">Together:</span>
            <span className="font-mono text-white font-semibold tracking-wider">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Right: Media Hub button + WebRTC status + Lock */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMediaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600/30 to-rose-600/30 hover:from-purple-600/50 hover:to-rose-600/50 border border-purple-500/40 text-xs font-medium text-purple-200 hover:text-white transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">
                {watchState.isActive ? (watchState.gameTitle || watchState.videoTitle || "Activities") : "Media & Games"}
              </span>
            </button>

            {/* Connection status pill */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : partnerOnline
                    ? "bg-amber-400 animate-ping"
                    : "bg-zinc-600"
                }`}
              />
              <span
                className={
                  connectionState === "connected"
                    ? "text-emerald-300 font-medium hidden md:inline"
                    : partnerOnline
                    ? "text-amber-300 hidden md:inline"
                    : "text-zinc-500 hidden md:inline"
                }
              >
                {connectionState === "connected"
                  ? "P2P Connected"
                  : partnerOnline
                  ? "Connecting..."
                  : "Partner Away"}
              </span>
            </div>

            {/* 2-Person Lock */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-zinc-400">
              <Users className="w-3 h-3 text-purple-400" />
              <span>2P Lock</span>
            </div>
          </div>
        </div>
      </header>

      {/* Permission Alert Banner */}
      {mediaError && (
        <div className="relative z-20 mx-auto max-w-xl px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Camera or microphone access was restricted. You can still use chat and screen sharing.</span>
        </div>
      )}

      {/* Main Content Area: Conditional Cinema vs Dual Video Grid */}
      <main className="relative z-10 flex-1 px-6 py-2 flex items-center justify-center">
        {watchState.isActive ? (
          /* CINEMA MODE: Center Stage Video or Game + Floating PiP Webcams */
          <div className="relative w-full max-w-6xl h-full max-h-[74vh] flex items-center justify-center">
            {/* Center Shared Video or Game */}
            {watchState.activeMode === "game" && watchState.gameType ? (
              <CoupleGames
                gameType={watchState.gameType}
                userRole={userRole}
                onSendGameMove={sendGameMove}
                lastRemoteMove={lastRemoteGameMove}
                onCloseGame={closeWatch}
              />
            ) : (
              <WatchPlayer
                videoId={watchState.videoId}
                videoTitle={watchState.videoTitle}
                localMedia={localMedia}
                remoteMovieStream={remoteMovieStream}
                remoteMovieTitle={remoteMovieTitle}
                isMovieStreaming={isMovieStreaming}
                onPlay={syncPlay}
                onPause={syncPause}
                onSeek={syncSeek}
                onClose={handleCloseWatch}
                onSelectVideo={(id, title) => {
                  if (localMedia?.url) {
                    URL.revokeObjectURL(localMedia.url);
                    setLocalMedia(null);
                  }
                  stopMovieStream();
                  loadVideo(id, title);
                }}
                onSelectLocalFile={handleSelectLocalMedia}
                onOpenYouTubeBrowser={() => setYoutubeBrowserOpen(true)}
                onTriggerScreenShare={toggleScreenShare}
                onStartMovieStream={startMovieStream}
                onStopMovieStream={stopMovieStream}
                registerPlayer={registerPlayer}
              />
            )}

            {/* Floating Picture-in-Picture Webcams (Top Right, below header controls) */}
            <div className="absolute top-16 right-4 z-30 flex flex-col gap-2 pointer-events-auto">
              {/* Partner PiP */}
              <div className="w-40 h-24 rounded-2xl overflow-hidden glass-panel border border-white/20 shadow-2xl relative bg-black/70">
                {/* Show screen share if partner is sharing, otherwise show webcam */}
                {remoteScreenStream ? (
                  <video
                    ref={remoteScreenCallbackRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${
                      hasRemoteMedia ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ) : (
                  <video
                    ref={remoteVideoCallbackRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${
                      hasRemoteMedia && remoteMediaState.videoActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}
                {(!hasRemoteMedia || (!remoteMediaState.videoActive && !remoteScreenStream)) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-rose-400 fill-rose-500/30" />
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-zinc-300">
                  Partner{remoteScreenStream ? " 🖥" : ""}
                </span>
              </div>

              {/* You PiP */}
              <div className="w-40 h-24 rounded-2xl overflow-hidden glass-panel border border-white/20 shadow-2xl relative bg-black/70">
                <video
                  ref={localVideoCallbackRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    videoActive ? "opacity-100" : "opacity-0"
                  } ${screenSharing ? "" : "-scale-x-100"}`}
                />
                {!videoActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-purple-400 fill-purple-500/30" />
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-zinc-300">
                  You
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* DUAL VIDEO CANVAS MODE (Romantic Aura Co-Presence) */
          <div className="w-full max-w-6xl h-full max-h-[74vh] grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SLOT 1: YOU (Local Stream Portal) */}
            <div className={`relative rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col justify-between p-4 bg-[#14141C]/80 shadow-2xl transition-all duration-500 ${
              videoActive ? "aura-violet-active" : ""
            }`}>
              <div className="flex items-center justify-between z-20">
                <span className="px-3.5 py-1 rounded-full glass-panel text-xs font-semibold text-purple-200 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
                  <span>{userRole === "owner" ? "Host 👑" : "Partner ✨"}</span>
                  <span className="text-zinc-400 font-normal">(You)</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {screenSharing && (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/25 border border-purple-500/40 text-purple-200 text-[11px] flex items-center gap-1 shadow-sm">
                      <MonitorUp className="w-3 h-3" />
                      <span>Screen Active</span>
                    </span>
                  )}
                  {!micActive && (
                    <div className="p-1.5 rounded-xl bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm" title="Mic Muted">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!videoActive && (
                    <div className="p-1.5 rounded-xl bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm" title="Camera Off">
                      <VideoOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Canvas */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-black/40">
                <video
                  ref={localVideoCallbackRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    videoActive ? "opacity-100" : "opacity-0"
                  } ${screenSharing ? "" : "-scale-x-100"}`}
                />

                {!videoActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-radial from-purple-900/20 to-transparent">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600/30 to-rose-600/30 border border-purple-500/40 flex items-center justify-center glow-violet mb-3 relative heart-beat">
                      <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl" />
                      <Heart className="w-10 h-10 text-purple-300 fill-purple-500/30" />
                    </div>
                    <span className="text-sm font-semibold text-white">Your Camera is Resting</span>
                    <span className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${micActive ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                      {micActive ? "Microphone streaming" : "Microphone muted"}
                    </span>
                  </div>
                )}
              </div>

              <div className="z-20 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Your Stream</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/5 text-[10px]">
                  Encrypted Co-Presence
                </span>
              </div>
            </div>

            {/* SLOT 2: PARTNER (Remote Stream Portal) */}
            <div className={`relative rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col justify-between p-4 bg-[#14141C]/80 shadow-2xl transition-all duration-500 ${
              hasRemoteMedia && remoteMediaState.videoActive ? "aura-rose-active" : ""
            }`}>
              <div className="flex items-center justify-between z-20">
                <span className="px-3.5 py-1 rounded-full glass-panel text-xs font-semibold text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
                  <span>{userRole === "owner" ? "Partner ✨" : "Host 👑"}</span>
                  <span className="text-zinc-400 font-normal">
                    ({partnerOnline ? "Connected" : "Waiting"})
                  </span>
                </span>

                <div className="flex items-center gap-1.5">
                  {remoteMediaState.screenSharing && (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/25 border border-purple-500/40 text-purple-200 text-[11px] flex items-center gap-1 shadow-sm">
                      <MonitorUp className="w-3 h-3" />
                      <span>Screen Active</span>
                    </span>
                  )}
                  {!remoteMediaState.micActive && (
                    <div className="p-1.5 rounded-xl bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm" title="Partner Muted">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!remoteMediaState.videoActive && hasRemoteMedia && (
                    <div className="p-1.5 rounded-xl bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm" title="Partner Video Off">
                      <VideoOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Canvas */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-black/40">
                {/* When partner is screen sharing, show screen as main + webcam as PiP */}
                {remoteScreenStream ? (
                  <>
                    {/* Screen share as main */}
                    <video
                      ref={remoteScreenCallbackRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain transition-opacity duration-300 opacity-100"
                    />
                    {/* Webcam as PiP overlay */}
                    <div className="absolute bottom-3 right-3 w-28 h-20 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/60 z-30">
                      <video
                        ref={remoteVideoCallbackRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${
                          remoteMediaState.videoActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {!remoteMediaState.videoActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <video
                      ref={remoteVideoCallbackRef}
                      autoPlay
                      playsInline
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        hasRemoteMedia && remoteMediaState.videoActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </>
                )}

                {(!hasRemoteMedia || (!remoteMediaState.videoActive && !remoteScreenStream)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-radial from-rose-900/20 to-transparent">
                    {hasRemoteMedia && !remoteMediaState.videoActive ? (
                      <>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600/30 to-purple-600/30 border border-rose-500/40 flex items-center justify-center glow-rose mb-3 relative heart-beat">
                          <Heart className="w-10 h-10 text-rose-300 fill-rose-500/30" />
                        </div>
                        <span className="text-sm font-semibold text-white">Partner&apos;s Camera is Off</span>
                        <span className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${remoteMediaState.micActive ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                          {remoteMediaState.micActive ? "Audio stream connected" : "Microphone muted"}
                        </span>
                      </>
                    ) : partnerOnline ? (
                      <>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600/30 to-purple-600/30 border border-rose-500/40 flex items-center justify-center glow-rose mb-3 animate-pulse">
                          <Heart className="w-10 h-10 text-rose-300 fill-rose-500/30" />
                        </div>
                        <span className="text-sm font-semibold text-white">Partner is Online ❤️</span>
                        <p className="text-xs text-zinc-400 max-w-xs mt-1">
                          Securing direct P2P audio & video stream...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3 relative">
                          <Sparkles className="w-10 h-10 text-rose-400 animate-pulse" />
                        </div>
                        <span className="text-sm font-semibold text-white">Waiting for Your Partner</span>
                        <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
                          Send your private sanctuary invite link. Your video streams will connect instantly.
                        </p>
                        <button
                          onClick={copyInvite}
                          className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? "Invite Copied!" : "Copy Private Link"}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="z-20 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionState === "connected"
                        ? "bg-emerald-400"
                        : partnerOnline
                        ? "bg-amber-400 animate-ping"
                        : "bg-zinc-600"
                    }`}
                  />
                  <span>
                    {connectionState === "connected"
                      ? "P2P Stream Active"
                      : partnerOnline
                      ? "Handshake Sync..."
                      : "Waiting for Partner"}
                  </span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/5 text-[10px]">
                  {hasRemoteMedia ? "Audio & Video" : "Awaiting Media"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Dynamic Island Controls Dock */}
      <footer className="relative z-20 w-full px-6 py-5 flex flex-col items-center gap-3">
        {/* Reaction Bar */}
        <ReactionPicker onReact={sendReaction} />

        {/* Dynamic Island Pill Dock */}
        <div className="px-6 py-2.5 rounded-full glass-island glow-violet flex items-center gap-3 shadow-2xl">
          {/* Mic Button */}
          <button
            onClick={toggleMic}
            className={`relative p-3.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
              micActive
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 ring-1 ring-rose-500/50"
            }`}
            title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#120F24] ${
                micActive ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
          </button>

          {/* Video Button */}
          <button
            onClick={toggleVideo}
            className={`relative p-3.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
              videoActive
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 ring-1 ring-rose-500/50"
            }`}
            title={videoActive ? "Turn Off Camera" : "Turn On Camera"}
          >
            {videoActive ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#120F24] ${
                videoActive ? "bg-purple-400" : "bg-rose-500"
              }`}
            />
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
              screenSharing
                ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50 ring-2 ring-purple-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* Watch Together & Activities Hub Button */}
          <button
            onClick={() => setMediaModalOpen(true)}
            className={`relative p-3.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
              watchState.isActive
                ? "bg-gradient-to-tr from-purple-600 to-rose-600 text-white shadow-lg shadow-purple-900/50 ring-2 ring-rose-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Select Media & Activities Hub"
          >
            <Tv className="w-5 h-5" />
            {watchState.isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#120F24] animate-ping" />
            )}
          </button>

          {/* YouTube & Music Search Button */}
          <button
            onClick={() => setYoutubeBrowserOpen(true)}
            className="p-3.5 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg shadow-red-900/20"
            title="Search YouTube Music & Videos"
          >
            <Play className="w-5 h-5 fill-current" />
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`relative p-3.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
              chatOpen
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Room Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center text-white ring-2 ring-[#120F24]">
                {messages.length > 9 ? "9+" : messages.length}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/15 mx-1" />

          {/* Leave Button */}
          <Link
            href="/dashboard"
            className="p-3.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg shadow-rose-900/40"
            title="Leave Room"
          >
            <PhoneOff className="w-5 h-5" />
          </Link>
        </div>
      </footer>

      {/* Select Media & Activities Modal */}
      <MediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelectYouTube={(id, title) => {
          if (localMedia?.url) {
            URL.revokeObjectURL(localMedia.url);
            setLocalMedia(null);
          }
          loadVideo(id, title);
        }}
        onSelectLocalMedia={handleSelectLocalMedia}
        onSelectGame={(gameType, title) => loadGame(gameType, title)}
        onTriggerScreenShare={toggleScreenShare}
      />

      {/* Embedded YouTube Browser Modal */}
      <YouTubeBrowser
        isOpen={youtubeBrowserOpen}
        onClose={() => setYoutubeBrowserOpen(false)}
        onSelectVideo={(id, title) => loadVideo(id, title)}
      />
    </div>
  );
}
