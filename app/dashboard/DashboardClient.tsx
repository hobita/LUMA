"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  Plus,
  DoorOpen,
  LogOut,
  Users,
  Video,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Share2,
  ArrowRight,
  Radio,
  Settings2,
  Trash2,
} from "lucide-react";
import { signOutAction } from "../(auth)/actions";
import {
  createRoomAction,
  joinRoomAction,
  deleteRoomAction,
  leaveRoomAction,
} from "@/lib/room/actions";
import { UserSanctuaryResult } from "@/types/room";

interface DashboardClientProps {
  initialSanctuary: UserSanctuaryResult;
}

export default function DashboardClient({ initialSanctuary }: DashboardClientProps) {
  const [sanctuary, setSanctuary] = useState(initialSanctuary);
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("Our Sanctuary");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOtherOptions, setShowOtherOptions] = useState(!sanctuary.room);

  const hasRoom = !!sanctuary.room;
  const room = sanctuary.room;
  const isOwner = sanctuary.role === "owner";

  const getInviteUrl = () => {
    if (!room) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${room.slug}`;
    }
    return `/room/${room.slug}`;
  };

  const handleCopyLink = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      prompt("Copy your Sanctuary link:", url);
    }
  };

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const res = await createRoomAction(roomName);
      if (res?.error) {
        setErrorMessage(res.error);
        setIsCreating(false);
      }
    } catch {
      // Handled by Next.js Server Action redirect
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setIsJoining(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("slug", roomCode.trim());

    try {
      const res = await joinRoomAction(formData);
      if (res?.error) {
        setErrorMessage(res.error);
        setIsJoining(false);
      }
    } catch {
      // Handled by Next.js Server Action redirect
    }
  }

  async function handleResetSanctuary() {
    if (!room) return;
    const confirmed = confirm(
      isOwner
        ? "Are you sure you want to reset your Sanctuary? This will close the room for both of you."
        : "Are you sure you want to disconnect from this Sanctuary?"
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      if (isOwner) {
        await deleteRoomAction(room.id);
      } else {
        await leaveRoomAction(room.id);
      }
      setSanctuary({ room: null, role: null, partnerProfile: null });
      setShowOtherOptions(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset room.";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0B0B10] text-white">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-purple-600/20 via-pink-600/10 to-transparent blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[500px] h-[500px] bg-rose-600/10 blur-[150px] rounded-full" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center glow-rose group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
          </div>
          <span className="text-xl font-semibold tracking-wider bg-gradient-to-r from-white via-purple-200 to-rose-200 bg-clip-text text-transparent">
            LUMA
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-subtle text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>2-Person RLS Guard</span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 flex-1">
        {/* Error notification */}
        {errorMessage && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Welcome greeting */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs text-purple-300 mb-3">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>
                {sanctuary.userDisplayName
                  ? `Welcome back, ${sanctuary.userDisplayName} 💕`
                  : "Private Couple Sanctuary"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {hasRoom ? "Your Sanctuary Is Ready" : "Our Shared Space"}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {hasRoom
                ? "Your private space is always open. Enter, exit, and re-enter anytime without re-creating."
                : "Create your eternal room or join your partner with their invite code."}
            </p>
          </div>

          {hasRoom && (
            <button
              onClick={() => setShowOtherOptions((prev) => !prev)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showOtherOptions ? "Hide other options" : "Room options"}</span>
            </button>
          )}
        </div>

        {/* PRIMARY HERO CARD: Active Sanctuary (if user has a room) */}
        {hasRoom && room && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-8 sm:p-10 rounded-3xl glass-island relative overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-950/40"
          >
            {/* Ambient inner halo */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-rose-500/15 rounded-full blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px]" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                    <span>Permanent Sanctuary</span>
                  </span>

                  {sanctuary.partnerProfile ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>
                        Partner: {sanctuary.partnerProfile.display_name || "Linked ✨"}
                      </span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Waiting for Partner to Join</span>
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                    <span>{room.name || "Our Sanctuary"}</span>
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-500/40" />
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-400 font-mono">
                    Code: <span className="text-purple-300 font-semibold">{room.slug}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Come join me in our LUMA sanctuary: ${getInviteUrl()}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl glass-panel text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.08] transition-all"
                    title="Share via WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Enter Button */}
              <div className="flex flex-col gap-3 min-w-[220px]">
                <Link
                  href={`/room/${room.slug}`}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-base shadow-xl shadow-purple-900/40 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <span>Enter Our Sanctuary</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <p className="text-[11px] text-center text-zinc-500">
                  Ready anytime &bull; Leave &amp; return freely
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Secondary Section: Create / Join Forms */}
        <AnimatePresence>
          {(!hasRoom || showOtherOptions) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {hasRoom && (
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Manage or Connect to Another Room
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Create Room */}
                <div className="p-8 rounded-3xl glass-panel glow-violet flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Create a Private Room</h2>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      Generates a new secure 2-person room. Send the private invite link to your partner.
                    </p>
                  </div>

                  <form onSubmit={handleCreateRoom} className="mt-8 space-y-3">
                    <div>
                      <label
                        className="block text-xs font-medium text-zinc-400 mb-1.5"
                        htmlFor="roomName"
                      >
                        Room Name (Optional)
                      </label>
                      <input
                        id="roomName"
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Our Sanctuary"
                        className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-sm shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Sanctuary...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate New Room</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Card 2: Join Room with Code */}
                <div className="p-8 rounded-3xl glass-panel flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Join Partner&apos;s Room</h2>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      If your partner has created a room, enter their invite code below to link your accounts.
                    </p>
                  </div>

                  <form onSubmit={handleJoinRoom} className="mt-8 space-y-3">
                    <div>
                      <label
                        className="block text-xs font-medium text-zinc-400 mb-1.5"
                        htmlFor="roomCode"
                      >
                        Room Code or Slug
                      </label>
                      <input
                        id="roomCode"
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="e.g. sanctuary-7F92"
                        className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20 transition-all font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!roomCode.trim() || isJoining}
                      className="w-full py-3.5 px-4 rounded-2xl glass-panel text-white font-medium text-sm hover:bg-white/[0.08] flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Access...</span>
                        </>
                      ) : (
                        <>
                          <span>Join Space</span>
                          <DoorOpen className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Danger Zone: Reset Current Room */}
              {hasRoom && (
                <div className="mt-6 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-rose-300">
                      {isOwner ? "Reset Sanctuary" : "Disconnect from Sanctuary"}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {isOwner
                        ? "Permanently delete this room so you can create a fresh one."
                        : "Leave this room so you can join a different room."}
                    </div>
                  </div>

                  <button
                    onClick={handleResetSanctuary}
                    disabled={isDeleting}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isOwner ? "Delete Room" : "Leave Room"}</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security & Co-Presence Info Banner */}
        <div className="mt-10 p-6 rounded-3xl glass-panel-subtle border border-white/[0.05] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">2-Member Max</div>
              <div>Locked to two verified lovers; no intruders.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">Direct WebRTC</div>
              <div>Encrypted peer-to-peer audio and video.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">Persistent Sanctuary</div>
              <div>Enter, leave, and rejoin anytime.</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/[0.05] text-center text-xs text-zinc-600">
        LUMA &mdash; Distance doesn&apos;t have to feel distant.
      </footer>
    </div>
  );
}
