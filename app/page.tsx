"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Sparkles, Video, Tv, Gamepad2, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-purple-600/15 via-pink-600/10 to-transparent blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 -left-60 w-[500px] h-[500px] bg-purple-900/10 blur-[130px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 -right-40 w-[450px] h-[450px] bg-rose-600/10 blur-[120px] rounded-full" />

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 glow-rose">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-500/30" />
          </div>
          <span className="text-xl font-semibold tracking-wider bg-gradient-to-r from-white via-purple-200 to-rose-200 bg-clip-text text-transparent">
            LUMA
          </span>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-medium rounded-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        {/* Intimate badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-purple-300 mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>A private sanctuary crafted exclusively for two</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.15] max-w-4xl"
        >
          Distance doesn’t have to feel{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
            distant.
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl font-light leading-relaxed"
        >
          Step into your private virtual room. Stream your favorite shows together, share your screen, video call in high definition, and share the same moment from anywhere in the world.
        </motion.p>

        {/* Primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Enter Our Room</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel text-zinc-200 hover:text-white font-medium hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In to Your Space</span>
          </Link>
        </motion.div>

        {/* Interactive Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left"
        >
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl glass-panel hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Private Sanctuary</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Strict 2-member lock. Nobody can drop in on your moments. Protected by database-level security.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl glass-panel hover:border-rose-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Peer-to-Peer Media</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Ultra-low latency audio, video, and screen sharing direct between your devices with WebRTC.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl glass-panel hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Watch Together</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Synchronized video playback. Play, pause, and scrub in perfect sync with real-time drift correction.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-3xl glass-panel hover:border-rose-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Games & Reactions</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Couple trivia, &quot;Would You Rather&quot;, and floating heart reactions designed for two lovers.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-rose-500/60" />
          <span>LUMA &mdash; Designed with care for long-distance love.</span>
        </div>
        <div className="flex items-center gap-6">
          <span>Serverless & Cloud Native</span>
          <span>End-to-End P2P Media</span>
        </div>
      </footer>
    </div>
  );
}
