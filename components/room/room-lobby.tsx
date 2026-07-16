"use client";

import { useRoomParticipants } from "@/hooks/use-room-participants";
import { InvitePanel } from "./invite-panel";
import { RoomPresence } from "./room-presence";
import { ParticipantChip } from "./participant-dot";
import type { Participant } from "@/types/room";

/**
 * The room before the film starts: who's here, and how to get your person in.
 *
 * This is a real state, not a placeholder — the night genuinely hasn't started
 * until both people are here. Feature 3 replaces the invite column with the
 * player once someone picks a film.
 */
export function RoomLobby({
  code,
  inviteUrl,
  initialParticipants,
  youId,
}: {
  code: string;
  inviteUrl: string;
  initialParticipants: Participant[];
  youId: string | null;
}) {
  const participants = useRoomParticipants(code, initialParticipants);
  const everyoneHere = participants.length >= 2;

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {everyoneHere ? "You're both here" : "Your room is ready"}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {everyoneHere
              ? "Same couch, miles apart."
              : "Now bring your person in."}
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            {everyoneHere
              ? "Everyone's in the room. Next you'll pick a film and press play together."
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

          <InvitePanel
            code={code}
            inviteUrl={inviteUrl}
            connected={everyoneHere}
          />
        </div>
      </div>
    </div>
  );
}
