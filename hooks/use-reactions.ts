"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { insertReaction } from "@/lib/supabase/social";
import { REACTION_FLOAT_MS } from "@/constants/reactions";
import { SOCIAL_EVENT } from "@/types/chat";
import type { Me, ReactionSignal } from "@/types/chat";

interface ReactionsState {
  /** Reactions currently floating up the screen. */
  floats: ReactionSignal[];
  react: (emoji: string) => void;
}

/**
 * Floating reactions.
 *
 * The float is delivered over broadcast for low latency (an emoji should appear
 * the instant it's tapped), and the same reaction is persisted to the reactions
 * table for the Movie Night Summary's tally (Feature 6). The broadcast is the
 * animation; the row is the memory.
 */
export function useReactions(code: string, me: Me): ReactionsState {
  const [floats, setFloats] = useState<ReactionSignal[]>([]);

  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowserClient>["channel"]
  > | null>(null);
  const cleanupTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addFloat = useCallback((signal: ReactionSignal) => {
    setFloats((current) => [...current, signal]);
    const timer = setTimeout(() => {
      setFloats((current) => current.filter((f) => f.id !== signal.id));
    }, REACTION_FLOAT_MS);
    cleanupTimers.current.push(timer);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`room-reactions:${code}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: SOCIAL_EVENT.reaction }, ({ payload }) => {
        addFloat(payload as ReactionSignal);
      })
      .subscribe();

    const timers = cleanupTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [code, addFloat]);

  const react = useCallback(
    (emoji: string) => {
      const signal: ReactionSignal = {
        id: crypto.randomUUID(),
        emoji,
        participantId: me.id,
        color: me.color,
      };
      // Show it locally (self:false means we don't hear our own broadcast).
      addFloat(signal);
      void channelRef.current?.send({
        type: "broadcast",
        event: SOCIAL_EVENT.reaction,
        payload: signal,
      });
      // Persist for the summary; a failed tally shouldn't interrupt the moment.
      void insertReaction({ roomCode: code, me, emoji }).catch(() => undefined);
    },
    [code, me, addFloat],
  );

  return { floats, react };
}
