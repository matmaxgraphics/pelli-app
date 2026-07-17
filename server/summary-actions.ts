"use server";

import { endRoom, getRoom } from "@/services/rooms";
import { recallSeat } from "@/lib/session";
import { isValidRoomCode } from "@/utils/room-code";

/**
 * End the night. Host-only, so a guest can't cut the evening short — the same
 * seat-cookie check the film picker uses. Everyone flips to the Summary off the
 * resulting room UPDATE.
 */

export interface EndNightResult {
  error: string | null;
}

export async function endNightAction(code: string): Promise<EndNightResult> {
  if (!isValidRoomCode(code)) {
    return { error: "That room code isn't valid." };
  }

  const seat = await recallSeat(code);
  if (!seat) {
    return { error: "Only the host can end the night." };
  }

  const room = await getRoom(code);
  if (!room) {
    return { error: "That room isn't here anymore." };
  }

  const host = room.participants.find((p) => p.role === "host");
  if (!host || host.id !== seat) {
    return { error: "Only the host can end the night." };
  }

  await endRoom(code);
  return { error: null };
}
