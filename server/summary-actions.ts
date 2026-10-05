"use server";

import { endRoom } from "@/services/rooms";
import { deleteFilm } from "@/services/storage";
import { requireHost } from "@/lib/room-access";

/**
 * End the night. Host-only, so a guest can't cut the evening short. Everyone
 * flips to the Summary off the resulting room UPDATE.
 *
 * It also deletes the film. Pelli keeps a night's memories (the Summary, the
 * keepsake), not the movie: storage stays cheap, and nothing outlives the night
 * that the people in it didn't make themselves.
 */

export interface EndNightResult {
  error: string | null;
}

export async function endNightAction(code: string): Promise<EndNightResult> {
  const guard = await requireHost(String(code), "end the night");
  if (!guard.ok) return { error: guard.error };

  const { room } = guard.seat;
  await endRoom(guard.seat.code);

  // After the room has ended, so a storage hiccup can never keep a night open.
  // If the delete fails, the bucket's 1-day lifecycle rule is the backstop.
  if (room.video?.kind === "upload" && room.video.path) {
    await deleteFilm(room.video.path).catch(() => undefined);
  }

  return { error: null };
}
