"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactionSignal } from "@/types/chat";

/**
 * Reactions drifting up over the film — the "we're watching together" feeling
 * made visible. A transient layer: each emoji rises, sways, and fades, then the
 * hook drops it from the list.
 */
export function FloatingReactions({ floats }: { floats: ReactionSignal[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {floats.map((float) => {
          // Stable per-emoji offset/drift derived from the id, so re-renders
          // don't make a floating emoji jump.
          const seed = hash(float.id);
          const startLeft = 12 + (seed % 60); // 12%–72% across the width
          const drift = ((seed >> 3) % 40) - 20; // -20px..+20px sway

          return (
            <motion.span
              key={float.id}
              className="absolute bottom-6 text-3xl"
              style={{ left: `${startLeft}%` }}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -220, x: drift, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
            >
              {float.emoji}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Tiny deterministic string hash → non-negative int. */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
