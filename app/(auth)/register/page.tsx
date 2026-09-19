"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Lock, Mail, User, ArrowRight, Sparkles } from "lucide-react";
import { signupAction } from "../actions";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signupAction(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch {
      // Redirect handled by server action
    }
  }

  function handleDemoAccess() {
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[400px] h-[400px] bg-rose-600/10 blur-[130px] rounded-full" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center glow-rose group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-500/30" />
            </div>
            <span className="text-2xl font-semibold tracking-wider text-white">LUMA</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Start your sanctuary</h1>
          <p className="mt-1 text-sm text-zinc-400">A shared place for the moments that matter</p>
        </div>

        {/* Register Card */}
        <div className="p-8 rounded-3xl glass-panel glow-violet">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="displayName">
                Your Name / Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  placeholder="e.g. Rayen"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@love.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-sm shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? "Creating your sanctuary..." : "Create Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Bypass Button */}
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full py-2.5 px-4 rounded-xl glass-panel-subtle text-xs text-purple-300 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Preview Dashboard (Instant Demo)</span>
            </button>
          </div>
        </div>

        {/* Link to Login */}
        <p className="text-center mt-6 text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 underline underline-offset-4">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
