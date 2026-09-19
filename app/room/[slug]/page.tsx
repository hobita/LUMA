import Link from "next/link";
import { Heart, Lock, ArrowLeft, PlusCircle } from "lucide-react";
import { getRoomAccess } from "@/lib/room/actions";
import { RoomClient } from "@/components/room/RoomClient";

interface RoomPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { slug } = await params;
  const access = await getRoomAccess(slug);

  // Error State 1: Room Full (Strict 2-Person Lock)
  if (!access.allowed && access.status === "room_full") {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#0B0B10] text-white">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-rose-600/10 blur-[130px] rounded-full" />
        <div className="relative z-10 w-full max-w-md text-center p-8 rounded-3xl glass-panel border border-rose-500/20 glow-rose">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">This Sanctuary is Full</h1>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            LUMA is an intimate digital room crafted strictly for two partners. This sanctuary already has two verified members.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-sm shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your Own Sanctuary</span>
            </Link>
            <Link
              href="/dashboard"
              className="py-3 px-4 rounded-xl glass-panel text-xs text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error State 2: Room Not Found
  if (!access.allowed && access.status === "not_found") {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#0B0B10] text-white">
        <div className="relative z-10 w-full max-w-md text-center p-8 rounded-3xl glass-panel border border-white/10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-6">
            <Heart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">This room doesn&apos;t exist</h1>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Double check the room code or ask your partner to send a fresh invite link.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm shadow-lg transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error State 3: Unauthorized (not logged in)
  if (!access.allowed && access.status === "unauthorized") {
    const { redirect } = await import("next/navigation");
    redirect(`/login?next=/room/${slug}`);
  }

  // Catch-all: if room data is missing for any reason, show not found
  if (!access.room || !access.currentUserId || !access.userRole) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#0B0B10] text-white">
        <div className="relative z-10 w-full max-w-md text-center p-8 rounded-3xl glass-panel border border-white/10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-6">
            <Heart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            We couldn&apos;t load this room. Try logging in again or check the room code.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm shadow-lg transition-all inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized: Render the room client
  return (
    <RoomClient
      room={access.room}
      userRole={access.userRole}
      currentUserId={access.currentUserId}
    />
  );
}
