"use client";

import { Radio } from "lucide-react";
import { VideoStage } from "./video-stage";
import { RoomPresence } from "./room-presence";
import { ParticipantDot } from "./participant-dot";
import type { Participant, PlaybackSnapshot, RoomVideo } from "@/types/room";

/**
 * The watch screen. The film fills the frame; presence sits above it so the
 * shared playhead — the whole point of Pelli — stays in view while you watch.
 */
export function Player({
  code,
  isHost,
  video,
  playback,
  participants,
  youId,
}: {
  code: string;
  isHost: boolean;
  video: RoomVideo;
  playback: PlaybackSnapshot;
  participants: Participant[];
  youId: string | null;
}) {
  const host = participants.find((p) => p.role === "host");

  return (
    <div className="container py-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Now watching together
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">
              {video.name}
            </h1>
          </div>

          {isHost ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Radio className="h-3.5 w-3.5" />
              You&apos;re hosting — controls sync to everyone
            </span>
          ) : host ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              <ParticipantDot color={host.color} size="sm" />
              {host.name} is hosting playback
            </span>
          ) : null}
        </div>

        <VideoStage
          code={code}
          isHost={isHost}
          video={video}
          initialPlayback={playback}
        />

        <RoomPresence participants={participants} youId={youId} />

        {!isHost && (
          <p className="text-center text-sm text-muted-foreground">
            Play, pause and seek follow the host — you stay on the same second.
          </p>
        )}
      </div>
    </div>
  );
}
