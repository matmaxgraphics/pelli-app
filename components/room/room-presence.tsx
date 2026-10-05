"use client";

import { motion, useReducedMotion } from "framer-motion";
import { avatarHex } from "@/constants/avatar-colors";
import { MAX_PARTICIPANTS } from "@/constants/room";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types/room";

/**
 * The landing page's presence-sync, returned as promised (rules.md §3): everyone
 * who's here, on one shared line.
 *
 * Alone, the line is a waiting line — your dot, a hollow one where someone will
 * be, and a spark travelling across the distance. Once someone arrives it
 * connects and stays connected, however many join (up to MAX_PARTICIPANTS).
 */
export function RoomPresence({
  participants,
  youId,
}: {
  participants: Participant[];
  youId: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const waiting = participants.length < 2;
  // One equal column per person; alone, a second column holds the empty slot.
  const columns = Math.max(participants.length, 2);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lift sm:p-6">
      <div className="relative">
        {/* The shared line, running from the first dot's centre to the last
            one's: half a column in from each edge. Dots and line both come
            from the same equal-column grid, so they agree at any width. */}
        <div
          aria-hidden
          className="absolute top-1.5 h-px bg-border"
          style={{ left: `${50 / columns}%`, right: `${50 / columns}%` }}
        >
          {waiting ? (
            !reduceMotion && (
              <motion.span
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
                initial={{ left: "0%" }}
                animate={{ left: ["0%", "100%", "0%"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )
          ) : (
            <motion.span
              className="absolute inset-y-0 left-0 block h-px bg-primary"
              initial={{ width: reduceMotion ? "100%" : 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </div>

        <ul
          className="relative grid items-start"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {participants.map((participant) => (
            <Person
              key={participant.id}
              participant={participant}
              isYou={participant.id === youId}
              pulse={!reduceMotion}
            />
          ))}
          {waiting && <EmptySlot />}
        </ul>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        {participants.length} of {MAX_PARTICIPANTS} here
      </p>
    </div>
  );
}

const columnClass = "flex min-w-0 flex-col items-center gap-2 px-1 text-center";

function Person({
  participant,
  isYou,
  pulse,
}: {
  participant: Participant;
  isYou: boolean;
  pulse: boolean;
}) {
  return (
    <li className={columnClass}>
      <motion.span
        className={cn(
          "h-3 w-3 shrink-0 rounded-full",
          isYou && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card",
        )}
        style={{ backgroundColor: avatarHex(participant.color) }}
        animate={pulse ? { opacity: [1, 0.45, 1] } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="w-full truncate text-sm font-medium text-foreground">
        {participant.name}
      </span>
      {isYou && (
        <span className="-mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          you
        </span>
      )}
    </li>
  );
}

function EmptySlot() {
  return (
    <li className={columnClass}>
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 rounded-full border border-dashed border-muted-foreground/50 bg-card"
      />
      <span className="w-full truncate text-sm text-muted-foreground">
        Waiting…
      </span>
    </li>
  );
}
