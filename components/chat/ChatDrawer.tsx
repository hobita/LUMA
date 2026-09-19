"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, Sparkles } from "lucide-react";
import { ChatMessage } from "@/types/chat";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  partnerOnline: boolean;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUserId,
  partnerOnline,
}: ChatDrawerProps) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText("");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm glass-panel border-l border-white/10 flex flex-col justify-between shadow-2xl bg-[#101018]/90"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center glow-rose">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Our Whispers</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                      }`}
                    />
                    <span>{partnerOnline ? "Partner Online" : "Partner Away"}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <Sparkles className="w-8 h-8 mb-2 text-purple-400/50" />
                  <p className="text-xs font-medium text-zinc-400">No whispers yet</p>
                  <p className="text-[11px] mt-1 text-zinc-600">
                    Say something sweet to your partner. Messages are private and synced in real-time.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const time = new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white rounded-br-none shadow-md shadow-purple-950/40"
                            : "bg-white/[0.07] border border-white/10 text-zinc-200 rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 px-1">{time}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.08] bg-black/20">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Whisper something..."
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="absolute right-2 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600 transition-all"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
