"use client";

import { InvitePanel } from "./invite-panel";
import { RoomPresence } from "./room-presence";
import { ParticipantChip } from "./participant-dot";
import { VideoSourceForm } from "./video-source-form";
import type { Participant } from "@/types/room";

/**
 * The room before the film starts: who's here, and how to get your person in.
 *
 * A real state, not a placeholder — the night hasn't started until someone
 * picks a film. Presentational: RoomView owns the live subscription and passes
 * participants in. The host also gets the film picker here; the guest waits.
 */
export function RoomLobby({
  code,
  inviteUrl,
  participants,
  youId,
  isHost,
}: {
  code: string;
  inviteUrl: string;
  participants: Participant[];
  youId: string | null;
  isHost: boolean;
}) {
  const everyoneHere = participants.length >= 2;

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {everyoneHere ? "You're both here" : "Your room is ready"}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {everyoneHere ? "Same couch, miles apart." : "Now bring your person in."}
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            {everyoneHere
              ? isHost
                ? "Everyone's here. Choose tonight's film and you'll press play together."
                : "Everyone's here. The host is choosing tonight's film."
              : "Send them the link, the code, or the QR — whichever's easiest. This page updates the moment they arrive."}
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:gap-8">
          <div className="space-y-6">
            <RoomPresence participants={participants} youId={youId} />

            <section
              aria-label="Who's here"
              className="rounded-2xl border border-border bg-card p-5 shadow-subtle sm:p-6"
            >
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                In the room
              </h2>
              <ul className="mt-4 space-y-3">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    <ParticipantChip
                      name={participant.name}
                      color={participant.color}
                      trailing={
                        <span className="text-xs text-muted-foreground">
                          {participant.role === "host" ? "Host" : "Guest"}
                          {participant.id === youId && " · you"}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Everyone can see the invite; the host also gets the film picker
              below it. Once a film is set, RoomView swaps this whole screen for
              the player. */}
          <div className="space-y-6">
            <InvitePanel code={code} inviteUrl={inviteUrl} connected={everyoneHere} />
            {isHost && <VideoSourceForm code={code} />}
          </div>
        </div>
      </div>
    </div>
  );
}
