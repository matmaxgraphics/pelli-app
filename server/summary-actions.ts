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
  /** What happened to the uploaded film. "none" when there was nothing to delete. */
  cleanup: "none" | "deleted" | "failed";
}

export async function endNightAction(code: string): Promise<EndNightResult> {
  const guard = await requireHost(String(code), "end the night");
  if (!guard.ok) return { error: guard.error, cleanup: "none" };

  const { room } = guard.seat;
  await endRoom(guard.seat.code);

  if (room.video?.kind !== "upload" || !room.video.path) {
    return { error: null, cleanup: "none" };
  }

  // After the room has ended, so a storage hiccup can never keep a night open.
  // A failed delete is logged loudly rather than swallowed — a silent cleanup
  // failure means films quietly pile up in storage — and the bucket's 1-day
  // lifecycle rule remains the backstop.
  try {
    await deleteFilm(room.video.path);
    return { error: null, cleanup: "deleted" };
  } catch (failure) {
    console.error("[endNight] could not delete the film", {
      room: guard.seat.code,
      reason: failure instanceof Error ? failure.message : String(failure),
    });
    return { error: null, cleanup: "failed" };
  }
}
