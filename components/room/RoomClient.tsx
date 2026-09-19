"use client";

import { useState, useCallback } from "react";
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
import { Film } from "lucide-react";

interface RoomClientProps {
  room: Room;
  userRole: RoomRole;
  currentUserId: string;
}

export function RoomClient({ room, userRole, currentUserId }: RoomClientProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // 1. Realtime Presence
  const { partnerOnline, isConnected } = usePresence(
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

  // 5. Watch Together Synchronized Media & Games
  const {
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
  } = useWatchTogether(room.slug, currentUserId);

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

      {/* Top Floating Header */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center glow-rose group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
            </div>
            <span className="text-sm font-semibold tracking-wider text-white">{room.name}</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          {/* Room Code Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs">
            <span className="font-mono text-zinc-300 font-medium">{room.slug}</span>
            <button
              onClick={copyInvite}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Copy Room Link"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* Presence & Media Connection Indicators */}
        <div className="flex items-center gap-3">
          {/* Watch Status Pill (if watching) */}
          <button
            onClick={() => setMediaModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/35 text-xs text-purple-200 hover:text-white transition-all shadow-sm"
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>{watchState.isActive ? (watchState.gameTitle || watchState.videoTitle || "Media Hub") : "Select Media"}</span>
          </button>

          {/* WebRTC State Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-subtle text-xs">
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
                  ? "text-emerald-300 font-medium"
                  : partnerOnline
                  ? "text-amber-300"
                  : "text-zinc-400"
              }
            >
              {connectionState === "connected"
                ? "P2P Connected"
                : partnerOnline
                ? "Establishing WebRTC..."
                : "Partner Away"}
            </span>
          </div>

          {/* 2-Person Lock Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs text-purple-300">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>2-Person Lock</span>
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
                currentUserId={currentUserId}
                userRole={userRole}
                onSendGameMove={sendGameMove}
                lastRemoteMove={lastRemoteGameMove}
                onCloseGame={closeWatch}
              />
            ) : (
              <WatchPlayer
                videoId={watchState.videoId}
                videoTitle={watchState.videoTitle}
                onPlay={syncPlay}
                onPause={syncPause}
                onSeek={syncSeek}
                onClose={closeWatch}
                onSelectVideo={(id, title) => loadVideo(id, title)}
                registerPlayer={registerPlayer}
              />
            )}

            {/* Floating Picture-in-Picture Webcams (Top Right, below header controls) */}
            <div className="absolute top-16 right-4 z-30 flex flex-col gap-2 pointer-events-auto">
              {/* Partner PiP */}
              <div className="w-40 h-24 rounded-2xl overflow-hidden glass-panel border border-white/20 shadow-2xl relative bg-black/70">
                <video
                  ref={remoteVideoCallbackRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${
                    hasRemoteMedia && remoteMediaState.videoActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                {(!hasRemoteMedia || !remoteMediaState.videoActive) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-rose-400 fill-rose-500/30" />
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-zinc-300">
                  Partner
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
          /* DUAL VIDEO CANVAS MODE (Standard Co-presence) */
          <div className="w-full max-w-6xl h-full max-h-[74vh] grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SLOT 1: YOU (Local Stream) */}
            <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col justify-between p-4 bg-[#14141C]/80 shadow-2xl">
              <div className="flex items-center justify-between z-20">
                <span className="px-3 py-1 rounded-full glass-panel text-xs font-medium text-purple-300">
                  You ({userRole === "owner" ? "Host" : "Partner"})
                </span>

                <div className="flex items-center gap-1.5">
                  {screenSharing && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] flex items-center gap-1">
                      <MonitorUp className="w-3 h-3" />
                      <span>Sharing Screen</span>
                    </span>
                  )}
                  {!micActive && (
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400" title="Mic Muted">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!videoActive && (
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400" title="Camera Off">
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/40 flex items-center justify-center glow-violet mb-4">
                      <Heart className="w-10 h-10 text-purple-300 fill-purple-500/20" />
                    </div>
                    <span className="text-sm font-medium text-white">Camera Off</span>
                    <span className="text-xs text-zinc-500 mt-1">
                      {micActive ? "Microphone active" : "Microphone muted"}
                    </span>
                  </div>
                )}
              </div>

              <div className="z-20 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Local Media Feed</span>
                </span>
                <span>Channel: {isConnected ? "Active" : "Syncing"}</span>
              </div>
            </div>

            {/* SLOT 2: PARTNER (Remote Stream) */}
            <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col justify-between p-4 bg-[#14141C]/80 shadow-2xl">
              <div className="flex items-center justify-between z-20">
                <span className="px-3 py-1 rounded-full glass-panel text-xs font-medium text-rose-300">
                  Partner
                </span>

                <div className="flex items-center gap-1.5">
                  {remoteMediaState.screenSharing && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] flex items-center gap-1">
                      <MonitorUp className="w-3 h-3" />
                      <span>Sharing Screen</span>
                    </span>
                  )}
                  {!remoteMediaState.micActive && (
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400" title="Partner Muted">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!remoteMediaState.videoActive && hasRemoteMedia && (
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400" title="Partner Video Off">
                      <VideoOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Canvas */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-black/40">
                <video
                  ref={remoteVideoCallbackRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    hasRemoteMedia && remoteMediaState.videoActive ? "opacity-100" : "opacity-0"
                  }`}
                />

                {(!hasRemoteMedia || !remoteMediaState.videoActive) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    {hasRemoteMedia && !remoteMediaState.videoActive ? (
                      <>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/40 flex items-center justify-center glow-rose mb-4">
                          <Heart className="w-10 h-10 text-rose-300 fill-rose-500/30" />
                        </div>
                        <span className="text-sm font-medium text-white">Partner Camera Off</span>
                        <span className="text-xs text-zinc-400 mt-1">
                          {remoteMediaState.micActive ? "Audio streaming" : "Microphone muted"}
                        </span>
                      </>
                    ) : partnerOnline ? (
                      <>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/40 flex items-center justify-center glow-rose mb-4 animate-pulse">
                          <Heart className="w-10 h-10 text-rose-300 fill-rose-500/30" />
                        </div>
                        <span className="text-sm font-medium text-white">Partner is Online ❤️</span>
                        <p className="text-xs text-zinc-400 max-w-xs mt-1">
                          Connecting WebRTC encrypted media tracks...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 relative">
                          <Sparkles className="w-8 h-8 text-zinc-500 animate-pulse" />
                        </div>
                        <span className="text-sm font-medium text-zinc-300">Invite Your Partner</span>
                        <p className="text-xs text-zinc-500 max-w-xs mt-1">
                          Send your private link. When your partner opens this room, your media streams will connect.
                        </p>
                        <button
                          onClick={copyInvite}
                          className="mt-4 px-4 py-2 rounded-xl glass-panel text-xs font-medium text-rose-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? "Link Copied!" : "Copy Private Invite Link"}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="z-20 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
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
                      ? "Direct P2P Encrypted Stream"
                      : partnerOnline
                      ? "Negotiating SDP..."
                      : "Waiting for connection"}
                  </span>
                </span>
                <span>{hasRemoteMedia ? "Audio/Video Active" : "No Media"}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Controls Dock */}
      <footer className="relative z-20 w-full px-6 py-6 flex flex-col items-center gap-3">
        {/* Reaction Bar */}
        <ReactionPicker onReact={sendReaction} />

        {/* Main Controls Dock */}
        <div className="px-5 py-3 rounded-3xl glass-panel glow-violet flex items-center gap-3">
          {/* Mic Button */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl transition-all ${
              micActive
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/40"
            }`}
            title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Video Button */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all ${
              videoActive
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/40"
            }`}
            title={videoActive ? "Turn Off Camera" : "Turn On Camera"}
          >
            {videoActive ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition-all ${
              screenSharing
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* Watch Together & Activities Hub Button */}
          <button
            onClick={() => setMediaModalOpen(true)}
            className={`p-3.5 rounded-2xl transition-all ${
              watchState.isActive
                ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-lg shadow-purple-900/50 scale-105"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Select Media & Activities"
          >
            <Tv className="w-5 h-5" />
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`relative p-3.5 rounded-2xl transition-all ${
              chatOpen
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Room Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center text-white">
                {messages.length > 9 ? "9+" : messages.length}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/15 mx-1" />

          {/* Leave Button */}
          <Link
            href="/dashboard"
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all hover:scale-105"
            title="Leave Room"
          >
            <PhoneOff className="w-5 h-5" />
          </Link>
        </div>
      </footer>

      {/* Kosmi-Style Select Media & Activities Modal */}
      <MediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelectYouTube={(id, title) => loadVideo(id, title)}
        onSelectGame={(gameType, title) => loadGame(gameType, title)}
        onTriggerScreenShare={toggleScreenShare}
      />
    </div>
  );
}
