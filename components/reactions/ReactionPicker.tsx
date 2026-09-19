"use client";

import { motion } from "framer-motion";

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
}

const EMOJIS = ["❤️", "😂", "😭", "😮", "🔥"];

export function ReactionPicker({ onReact }: ReactionPickerProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel border border-white/10 glow-rose">
      {EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.35, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReact(emoji)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-white/10 transition-colors"
          title={`Send ${emoji}`}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}
