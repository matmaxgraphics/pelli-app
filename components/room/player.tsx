"use client";

import { Radio } from "lucide-react";
import { VideoStage } from "./video-stage";
import { RoomPresence } from "./room-presence";
import { ParticipantDot } from "./participant-dot";
import { ReactionBar } from "./reaction-bar";
import { FloatingReactions } from "./floating-reactions";
import { ChatPanel } from "./chat-panel";
import { useReactions } from "@/hooks/use-reactions";
import type { Participant, PlaybackSnapshot, RoomVideo } from "@/types/room";
import type { ChatMessage, Me } from "@/types/chat";

/**
 * The watch screen. The film with reactions floating over it and presence just
 * beneath, chat alongside — everything that makes two rooms feel like one.
 */
export function Player({
  code,
  isHost,
  me,
  video,
  playback,
  participants,
  initialMessages,
}: {
  code: string;
  isHost: boolean;
  me: Me;
  video: RoomVideo;
  playback: PlaybackSnapshot;
  participants: Participant[];
  initialMessages: ChatMessage[];
}) {
  const host = participants.find((p) => p.role === "host");
  const { floats, react } = useReactions(code, me);

  return (
    <div className="container py-6 md:py-8">
      <div className="mx-auto max-w-6xl">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <VideoStage
              code={code}
              isHost={isHost}
              video={video}
              initialPlayback={playback}
              overlay={<FloatingReactions floats={floats} />}
            />

            <div className="flex justify-center">
              <ReactionBar onReact={react} />
            </div>

            <RoomPresence participants={participants} youId={me.id} />

            {!isHost && (
              <p className="text-center text-sm text-muted-foreground">
                Play, pause and seek follow the host — you stay on the same second.
              </p>
            )}
          </div>

          <ChatPanel
            code={code}
            me={me}
            initialMessages={initialMessages}
            className="h-[420px] lg:h-[608px]"
          />
        </div>
      </div>
    </div>
  );
}
