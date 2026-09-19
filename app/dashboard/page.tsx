"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Plus,
  DoorOpen,
  Sparkles,
  LogOut,
  Users,
  Video,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { signOutAction } from "../(auth)/actions";
import { createRoomAction, joinRoomAction } from "@/lib/room/actions";

export default function DashboardPage() {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("Our Sanctuary");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0B0B10] text-white">
      {/* Subtle ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/3 w-[600px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[500px] h-[500px] bg-rose-600/10 blur-[140px] rounded-full" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center glow-rose">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
          </div>
          <span className="text-xl font-semibold tracking-wider text-white">LUMA</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>2-Person RLS Guard</span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
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
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs text-purple-300 mb-3">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>Private Couple Sanctuary</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Our Shared Space
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Create a new private sanctuary or enter with your partner&apos;s code.
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create Room */}
          <div className="p-8 rounded-3xl glass-panel glow-violet flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-white">Create a Private Room</h2>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Generates a secure 2-person room. Send the private invite link to your partner so you can share moments together.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="mt-8 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="roomName">
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
                If your partner has already created a room, paste their invite code below to step right in.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="mt-8 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="roomCode">
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
              <div>Direct encrypted audio/video tracks.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">Server-Side RLS</div>
              <div>Access enforced at PostgreSQL level.</div>
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
