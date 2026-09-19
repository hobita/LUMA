"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessage } from "@/types/chat";

export function useChat(slug: string, currentUserId: string, displayName = "You") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  // Load message history
  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      try {
        const supabase = supabaseRef.current;
        // First find room id by slug
        const { data: room } = await supabase
          .from("rooms")
          .select("id")
          .eq("slug", slug)
          .single();

        if (room?.id && isMounted) {
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("room_id", room.id)
            .order("created_at", { ascending: true })
            .limit(100);

          if (!error && data && isMounted) {
            setMessages(
              data.map((m) => ({
                id: m.id,
                room_id: m.room_id,
                sender_id: m.sender_id,
                content: m.content,
                created_at: m.created_at,
                sender_name: m.sender_id === currentUserId ? "You" : "Partner",
              }))
            );
          }
        }
      } catch {
        // Fallback for demo or connection init
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [slug, currentUserId]);

  // Subscribe to Realtime messages via broadcast channel and postgres_changes
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase.channel(`room:${slug}:chat`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "NEW_MESSAGE" }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      })
      .subscribe();

    // Local tab broadcast channel fallback for instant local development
    let localBroadcast: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      localBroadcast = new BroadcastChannel(`luma-chat-${slug}`);
      localBroadcast.onmessage = (event) => {
        if (event.data?.type === "CHAT_MESSAGE" && event.data.message) {
          const msg = event.data.message as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      };
    }

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      localBroadcast?.close();
    };
  }, [slug]);

  const sendMessage = useCallback(
    async (content: string) => {
      const cleanContent = content.trim();
      if (!cleanContent) return;

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: ChatMessage = {
        id: messageId,
        room_id: slug,
        sender_id: currentUserId,
        sender_name: displayName,
        content: cleanContent,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      // 1. Optimistic local update
      setMessages((prev) => [...prev, newMessage]);

      // 2. Broadcast immediately over Supabase Realtime WebSocket (<50ms)
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "NEW_MESSAGE",
          payload: newMessage,
        });
      }

      // 3. Send over local BroadcastChannel for multi-tab testing
      if (typeof window !== "undefined" && window.BroadcastChannel) {
        const localBroadcast = new BroadcastChannel(`luma-chat-${slug}`);
        localBroadcast.postMessage({
          type: "CHAT_MESSAGE",
          message: newMessage,
        });
        localBroadcast.close();
      }

      // 4. Persist to Supabase Postgres
      try {
        const supabase = supabaseRef.current;
        const { data: room } = await supabase
          .from("rooms")
          .select("id")
          .eq("slug", slug)
          .single();

        if (room?.id) {
          await supabase.from("messages").insert({
            id: messageId,
            room_id: room.id,
            sender_id: currentUserId,
            content: cleanContent,
          });
        }
      } catch {
        // Handled silently
      }
    },
    [slug, currentUserId, displayName]
  );

  return {
    messages,
    sendMessage,
    loading,
  };
}
