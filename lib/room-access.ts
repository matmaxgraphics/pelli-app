import "server-only";

import { getRoom } from "@/services/rooms";
import { recallSeat } from "@/lib/session";
import { isValidRoomCode, normalizeRoomCode } from "@/utils/room-code";
import type { Participant, RoomWithParticipants } from "@/types/room";

/**
 * Who is this person, in this room?
 *
 * The seat cookie is the only proof of identity Pelli has, so every action that
 * touches a room asks here instead of re-deriving it. One place decides what
 * "you're in this room" and "you're the host" mean.
 */

export interface Seat {
  code: string;
  room: RoomWithParticipants;
  me: Participant;
}

export type SeatResult =
  | { ok: true; seat: Seat }
  | { ok: false; error: string };

/** Anyone seated in the room. */
export async function requireParticipant(rawCode: string): Promise<SeatResult> {
  if (!isValidRoomCode(rawCode)) {
    return { ok: false, error: "That room code isn't valid." };
  }
  const code = normalizeRoomCode(rawCode);

  const seatId = await recallSeat(code);
  if (!seatId) {
    return { ok: false, error: "You're not seated in this room." };
  }

  const room = await getRoom(code);
  if (!room) {
    return { ok: false, error: "That room isn't here anymore." };
  }

  const me = room.participants.find((p) => p.id === seatId);
  if (!me) {
    return { ok: false, error: "You're not seated in this room." };
  }

  return { ok: true, seat: { code, room, me } };
}

/** The host only. `action` completes "Only the host can …". */
export async function requireHost(
  rawCode: string,
  action: string,
): Promise<SeatResult> {
  const result = await requireParticipant(rawCode);
  if (!result.ok) return result;

  if (result.seat.me.role !== "host") {
    return { ok: false, error: `Only the host can ${action}.` };
  }
  return result;
}
