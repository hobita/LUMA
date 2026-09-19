"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactionParticle } from "@/types/chat";

interface FloatingReactionsProps {
  particles: ReactionParticle[];
}

export function FloatingReactions({ particles }: FloatingReactionsProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              opacity: 0,
              scale: 0.4,
              y: 0,
              x: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, particle.scale * 1.3, particle.scale],
              y: -360,
              x: particle.xOffset,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.6,
              ease: [0.2, 0.8, 0.2, 1],
              times: [0, 0.15, 0.7, 1],
            }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 text-4xl select-none filter drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]"
          >
            {particle.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
