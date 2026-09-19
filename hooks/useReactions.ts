"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReactionParticle } from "@/types/chat";

export function useReactions(slug: string) {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  const spawnParticle = useCallback((emoji: string) => {
    const id = `particle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const xOffset = (Math.random() - 0.5) * 160; // Spread across -80px to +80px
    const scale = 0.8 + Math.random() * 0.5;

    const newParticle: ReactionParticle = {
      id,
      emoji,
      xOffset,
      scale,
    };

    setParticles((prev) => [...prev, newParticle]);

    // Auto cleanup after float animation finishes
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase.channel(`room:${slug}:reactions`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "REACTION_SENT" }, ({ payload }) => {
        if (payload?.emoji) {
          spawnParticle(payload.emoji);
        }
      })
      .subscribe();

    // Local tab broadcast channel
    let localBroadcast: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      localBroadcast = new BroadcastChannel(`luma-reactions-${slug}`);
      localBroadcast.onmessage = (event) => {
        if (event.data?.type === "REACTION" && event.data.emoji) {
          spawnParticle(event.data.emoji);
        }
      };
    }

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      localBroadcast?.close();
    };
  }, [slug, spawnParticle]);

  const sendReaction = useCallback(
    (emoji: string) => {
      // 1. Trigger locally
      spawnParticle(emoji);

      // 2. Broadcast via Supabase Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "REACTION_SENT",
          payload: { emoji },
        });
      }

      // 3. Local BroadcastChannel
      if (typeof window !== "undefined" && window.BroadcastChannel) {
        const localBroadcast = new BroadcastChannel(`luma-reactions-${slug}`);
        localBroadcast.postMessage({
          type: "REACTION",
          emoji,
        });
        localBroadcast.close();
      }
    },
    [slug, spawnParticle]
  );

  return {
    particles,
    sendReaction,
  };
}
