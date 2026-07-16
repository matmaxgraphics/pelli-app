import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormShell } from "@/components/room/form-shell";
import { IdentityForm } from "@/components/room/identity-form";
import { ParticipantDot } from "@/components/room/participant-dot";
import { joinRoomAction } from "@/server/room-actions";
import { getRoom } from "@/services/rooms";
import { recallIdentity, recallSeat } from "@/lib/session";
import { AVATAR_COLORS, DEFAULT_GUEST_COLOR } from "@/constants/avatar-colors";
import { formatRoomCode, isValidRoomCode, normalizeRoomCode } from "@/utils/room-code";
import type { AvatarColorId } from "@/constants/avatar-colors";

export const metadata: Metadata = {
  title: "Join a room",
};

/**
 * Where the invite link and the QR code land. The room is already known here,
 * so we can say who's waiting — the invite feels like a person, not a token.
 */
export default async function JoinRoomPage(props: PageProps<"/join/[code]">) {
  const { code: rawCode } = await props.params;

  if (!isValidRoomCode(rawCode)) notFound();
  const code = normalizeRoomCode(rawCode);

  const room = await getRoom(code);
  if (!room) notFound();

  // Already seated in this room (came back, or refreshed) — just go in.
  const seat = await recallSeat(code);
  if (seat && room.participants.some((p) => p.id === seat)) {
    redirect(`/room/${code}`);
  }

  const identity = await recallIdentity();
  const host = room.participants.find((p) => p.role === "host");
  const takenColors = room.participants.map((p) => p.color);

  const firstFreeColor =
    AVATAR_COLORS.find((c) => !takenColors.includes(c.id))?.id ??
    DEFAULT_GUEST_COLOR;

  return (
    <FormShell
      eyebrow={`Room ${formatRoomCode(code)}`}
      title={host ? `${host.name} is waiting for you.` : "You're invited."}
      subtitle="Add your name and pick a color, and you're in."
      backHref="/join"
      backLabel="Use a different code"
      footer={
        host ? (
          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-muted/50 px-4 py-3">
            <ParticipantDot color={host.color as AvatarColorId} pulse />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{host.name}</span> is
              already in the room
            </span>
          </div>
        ) : null
      }
    >
      <IdentityForm
        action={joinRoomAction}
        defaultIdentity={identity}
        defaultColor={firstFreeColor}
        takenColors={takenColors}
        submitLabel="Join the room"
        hidden={{ code }}
      />
    </FormShell>
  );
}
