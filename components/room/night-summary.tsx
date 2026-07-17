"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { ParticipantChip } from "./participant-dot";
import { MintKeepsake } from "./mint-keepsake";
import { useSummaryStats } from "@/hooks/use-summary-stats";
import type { Participant, RoomVideo } from "@/types/room";
import type { MintInput } from "@/lib/chain/keepsake";

/**
 * The keepsake, made visible before it's made permanent. When the night ends,
 * everyone lands here: what you watched, who was there, and how it felt —
 * assembled from the chat and reactions you actually left. Then, optionally,
 * mint it to Monad.
 */
export function NightSummary({
  code,
  video,
  participants,
  watchedAt,
}: {
  code: string;
  video: RoomVideo | null;
  participants: Participant[];
  /** The night's date (the room's creation), ISO string. */
  watchedAt: string;
}) {
  const stats = useSummaryStats(code);

  const filmName = video?.name ?? "Tonight's film";
  const dateLabel = formatDate(watchedAt);
  const topReaction = stats.topReactions[0]?.emoji ?? "🎬";

  const mintInput: MintInput = {
    title: filmName,
    participants: participants.map((p) => p.name),
    watchedAt: Math.floor(new Date(watchedAt).getTime() / 1000),
    topReaction,
  };

  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            That&apos;s a wrap
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {filmName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Watched together · {dateLabel}
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Who was here
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {participants.map((participant) => (
              <li key={participant.id}>
                <ParticipantChip
                  name={participant.name}
                  color={participant.color}
                />
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Top reaction"
              value={stats.loading ? "…" : stats.totalReactions > 0 ? topReaction : "—"}
              hint={
                stats.loading
                  ? undefined
                  : stats.totalReactions > 0
                    ? `${stats.topReactions[0]?.count} sent`
                    : "none yet"
              }
              big
            />
            <Stat
              label="Reactions"
              value={stats.loading ? "…" : String(stats.totalReactions)}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <Stat
              label="Messages"
              value={stats.loading ? "…" : String(stats.messageCount)}
              icon={<MessageCircle className="h-4 w-4" />}
            />
          </div>
        </section>

        <div className="mt-6">
          <MintKeepsake input={mintInput} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={big ? "mt-1 text-2xl" : "mt-1 text-2xl font-semibold text-foreground"}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "tonight";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
