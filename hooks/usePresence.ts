"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PresenceUser {
  userId: string;
  displayName: string;
  onlineAt: string;
}

export function usePresence(slug: string, currentUserId: string, displayName = "Love") {
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerData, setPartnerData] = useState<PresenceUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channelName = `room:${slug}:presence`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const userKeys = Object.keys(state);

        // Find partner's presence
        const partnerKey = userKeys.find((key) => key !== currentUserId);
        if (partnerKey && state[partnerKey]?.length > 0) {
          setPartnerOnline(true);
          setPartnerData(state[partnerKey][0]);
        } else {
          setPartnerOnline(false);
          setPartnerData(null);
        }
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (key !== currentUserId && newPresences?.length > 0) {
          setPartnerOnline(true);
          setPartnerData(newPresences[0] as unknown as PresenceUser);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key !== currentUserId) {
          setPartnerOnline(false);
          setPartnerData(null);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track({
            userId: currentUserId,
            displayName,
            onlineAt: new Date().toISOString(),
          });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    // Local tab broadcast fallback for local testing in development
    let localBroadcast: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      localBroadcast = new BroadcastChannel(`luma-local-${slug}`);
      localBroadcast.onmessage = (event) => {
        if (event.data?.type === "PRESENCE_PING" && event.data.userId !== currentUserId) {
          setPartnerOnline(true);
          setPartnerData({
            userId: event.data.userId,
            displayName: event.data.displayName || "Partner",
            onlineAt: new Date().toISOString(),
          });
          // Reply with pong
          localBroadcast?.postMessage({
            type: "PRESENCE_PONG",
            userId: currentUserId,
            displayName,
          });
        } else if (event.data?.type === "PRESENCE_PONG" && event.data.userId !== currentUserId) {
          setPartnerOnline(true);
          setPartnerData({
            userId: event.data.userId,
            displayName: event.data.displayName || "Partner",
            onlineAt: new Date().toISOString(),
          });
        } else if (event.data?.type === "PRESENCE_BYE" && event.data.userId !== currentUserId) {
          setPartnerOnline(false);
          setPartnerData(null);
        }
      };

      // Ping presence
      localBroadcast.postMessage({
        type: "PRESENCE_PING",
        userId: currentUserId,
        displayName,
      });
    }

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      if (localBroadcast) {
        localBroadcast.postMessage({
          type: "PRESENCE_BYE",
          userId: currentUserId,
        });
        localBroadcast.close();
      }
    };
  }, [slug, currentUserId, displayName]);

  return {
    partnerOnline,
    partnerData,
    isConnected,
  };
}
