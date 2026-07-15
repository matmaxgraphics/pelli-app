"use client";

import { motion } from "framer-motion";

/**
 * Pelli's signature: two people (host + guest) on the same playhead, connected
 * across distance. The dots pulse in step and the shared progress advances
 * together — "same frame, same second, miles apart." Kept deliberately quiet.
 */
export function PresenceSync() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Now watching together
        </span>
        <span className="font-mono text-xs text-muted-foreground">1:14:22</span>
      </div>

      {/* Two people, one line between them */}
      <div className="mb-5 flex items-center gap-3">
        <Person name="Ada" color="hsl(var(--primary))" />
        <div className="relative h-px flex-1 bg-border">
          <motion.span
            aria-hidden
            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
            initial={{ left: "8%" }}
            animate={{ left: ["8%", "92%", "8%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <Person name="Ovie" color="#57534E" align="right" />
      </div>

      {/* Shared playhead */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary/80"
          initial={{ width: "18%" }}
          animate={{ width: ["18%", "64%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function Person({
  name,
  color,
  align = "left",
}: {
  name: string;
  color: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <motion.span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ opacity: [1, 0.45, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}
