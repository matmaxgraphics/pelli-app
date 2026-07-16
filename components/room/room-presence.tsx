"use client";

import { motion } from "framer-motion";
import { avatarHex } from "@/constants/avatar-colors";
import type { Participant } from "@/types/room";

/**
 * The landing page's presence-sync, returned as promised (rules.md §3) — the
 * same two dots on one line, now showing real people instead of Ada and Ovie.
 *
 * Before the guest arrives the line is a waiting line: your dot, and a hollow
 * one where they'll be.
 */
export function RoomPresence({
  participants,
  youId,
}: {
  participants: Participant[];
  youId: string | null;
}) {
  const [first, second] = participants;
  const waiting = participants.length < 2;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-lift">
      <div className="flex items-center gap-4">
        <End participant={first} youId={youId} />

        <div className="relative h-px flex-1 bg-border">
          {waiting ? (
            // Travelling along the line: reaching across the distance.
            <motion.span
              aria-hidden
              className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
              initial={{ left: "0%" }}
              animate={{ left: ["0%", "100%", "0%"] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            // Connected: the line fills in once and stays.
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 block h-px bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </div>

        {second ? (
          <End participant={second} youId={youId} align="right" />
        ) : (
          <div className="flex flex-row-reverse items-center gap-2.5">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border border-dashed border-muted-foreground/50"
            />
            <span className="text-sm text-muted-foreground">Waiting…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function End({
  participant,
  youId,
  align = "left",
}: {
  participant?: Participant;
  youId: string | null;
  align?: "left" | "right";
}) {
  if (!participant) return null;

  return (
    <div
      className={`flex items-center gap-2.5 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <motion.span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: avatarHex(participant.color) }}
        animate={{ opacity: [1, 0.45, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="truncate text-sm font-medium text-foreground">
        {participant.name}
        {participant.id === youId && (
          <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>
        )}
      </span>
    </div>
  );
}
