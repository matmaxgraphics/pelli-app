"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeRoomCode } from "@/utils/room-code";

export interface ReactionCount {
  emoji: string;
  count: number;
}

export interface SummaryStats {
  loading: boolean;
  topReactions: ReactionCount[];
  totalReactions: number;
  messageCount: number;
}

/**
 * The night in numbers: the reaction tally and how much was said. Fetched once
 * when the Summary opens — the night is over, so this is a snapshot, not a live
 * feed. The reaction tally is also what the on-chain keepsake records.
 */
export function useSummaryStats(code: string): SummaryStats {
  const [stats, setStats] = useState<SummaryStats>({
    loading: true,
    topReactions: [],
    totalReactions: 0,
    messageCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    const room = normalizeRoomCode(code);

    async function load() {
      const [reactionsRes, messagesRes] = await Promise.all([
        supabase.from("reactions").select("emoji").eq("room_code", room),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("room_code", room),
      ]);

      if (cancelled) return;

      const tally = new Map<string, number>();
      for (const row of reactionsRes.data ?? []) {
        const emoji = (row as { emoji: string }).emoji;
        tally.set(emoji, (tally.get(emoji) ?? 0) + 1);
      }
      const topReactions = [...tally.entries()]
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        loading: false,
        topReactions,
        totalReactions: topReactions.reduce((sum, r) => sum + r.count, 0),
        messageCount: messagesRes.count ?? 0,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return stats;
}
