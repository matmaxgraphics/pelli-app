"use client";

import { InvitePanel } from "./invite-panel";
import { RoomPresence } from "./room-presence";
import { ParticipantChip } from "./participant-dot";
import { VideoSourceForm } from "./video-source-form";
import { MAX_PARTICIPANTS } from "@/constants/room";
import { isRoomFull } from "@/utils/room-capacity";
import type { Participant } from "@/types/room";

/**
 * The room before the film starts: who's here, and how to get your people in.
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
  uploadEnabled,
}: {
  code: string;
  inviteUrl: string;
  participants: Participant[];
  youId: string | null;
  isHost: boolean;
  uploadEnabled: boolean;
}) {
  const headcount = participants.length;
  const alone = headcount < 2;
  const full = isRoomFull(headcount);

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {alone
              ? "Your room is ready"
              : full
                ? "The room is full"
                : `${headcount} of ${MAX_PARTICIPANTS} here`}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {alone ? "Now bring your people in." : "Same couch, miles apart."}
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            {alone
              ? `Send them the link, the code, or the QR — whichever's easiest. Up to ${MAX_PARTICIPANTS} can join, and this page updates the moment someone arrives.`
              : isHost
                ? full
                  ? "Everyone's here. Choose tonight's film and you'll press play together."
                  : "Choose tonight's film when you're ready. More people can still join until the room fills."
                : "The host is choosing tonight's film."}
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
            <InvitePanel code={code} inviteUrl={inviteUrl} headcount={headcount} />
            {isHost && (
              <VideoSourceForm code={code} uploadEnabled={uploadEnabled} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
