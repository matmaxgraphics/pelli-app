"use server";

import { setRoomVideo } from "@/services/rooms";
import { deleteFilm, headFilm, presignRead } from "@/services/storage";
import { isR2Configured } from "@/lib/r2-env";
import { requireHost, requireParticipant } from "@/lib/room-access";
import { MAX_UPLOAD_BYTES } from "@/constants/playback";
import { isObjectKey, roomOfObjectKey } from "@/utils/object-key";
import { MAX_UPLOAD_MB } from "@/utils/video-file";
import type { RoomVideo } from "@/types/room";

/**
 * Choosing the film, and getting a viewer something they can play.
 *
 * Both are called imperatively (not from a form): an upload finishes in the
 * browser first, then tells us where the file landed.
 */

export type SetVideoInput =
  | { kind: "link"; code: string; name: string; url: string }
  | { kind: "upload"; code: string; name: string; key: string };

export interface SetVideoResult {
  error: string | null;
}

export type VideoUrlResult = { error: string } | { error: null; url: string };

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 80;

function checkLink(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const url = raw.trim();
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, error: "That link is too long." };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "That doesn't look like a link. Paste a full https:// URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Links need to start with http:// or https://." };
  }
  return { ok: true, url };
}

/** Free the old file once a room has moved on from it. Best effort by design. */
async function discardUpload(video: RoomVideo | null): Promise<void> {
  if (video?.kind !== "upload" || !video.path) return;
  await deleteFilm(video.path).catch(() => undefined);
}

/** Host-only. Points the room at a link, or at an upload that has landed in R2. */
export async function setVideoAction(
  input: SetVideoInput,
): Promise<SetVideoResult> {
  const guard = await requireHost(String(input.code), "choose the film");
  if (!guard.ok) return { error: guard.error };
  const { code, room } = guard.seat;

  if (room.status === "ended") {
    return { error: "This night has already ended." };
  }

  const name =
    String(input.name ?? "").trim().slice(0, MAX_TITLE_LENGTH) || "Tonight's film";

  if (input.kind === "link") {
    const checked = checkLink(String(input.url ?? ""));
    if (!checked.ok) return { error: checked.error };

    await setRoomVideo(code, { kind: "link", url: checked.url, name, path: null });
    await discardUpload(room.video);
    return { error: null };
  }

  if (input.kind === "upload") {
    if (!isR2Configured()) {
      return { error: "Uploads aren't set up yet. Paste a link instead." };
    }

    // The key must be well-formed AND belong to this room. Without this a host
    // could aim their room at any file in the bucket.
    const key = String(input.key ?? "");
    if (!isObjectKey(key) || roomOfObjectKey(key) !== code) {
      return { error: "That upload doesn't belong to this room." };
    }

    // Trust what is actually in storage, not what the browser claims.
    let landed: { size: number } | null;
    try {
      landed = await headFilm(key);
    } catch {
      return { error: "Couldn't confirm the upload. Try again." };
    }
    if (!landed || landed.size <= 0) {
      return { error: "That upload didn't finish. Try again." };
    }
    if (landed.size > MAX_UPLOAD_BYTES) {
      await deleteFilm(key).catch(() => undefined);
      return { error: `That file is over ${MAX_UPLOAD_MB} MB.` };
    }

    await setRoomVideo(code, { kind: "upload", url: null, name, path: key });
    if (room.video?.kind === "upload" && room.video.path !== key) {
      await discardUpload(room.video);
    }
    return { error: null };
  }

  return { error: "Unknown film source." };
}

/**
 * A URL this person can stream the film from. Anyone seated in the room can
 * have one; nobody else can. For an upload it's signed, and expires.
 */
export async function getVideoUrlAction(code: string): Promise<VideoUrlResult> {
  const guard = await requireParticipant(String(code));
  if (!guard.ok) return { error: guard.error };
  const { room } = guard.seat;

  const video = room.video;
  if (!video) return { error: "No film has been chosen yet." };
  if (room.status === "ended") return { error: "This night has ended." };

  if (video.kind === "link") {
    return video.url
      ? { error: null, url: video.url }
      : { error: "That film has no link." };
  }

  if (!video.path) return { error: "That film is missing its file." };
  if (!isR2Configured()) {
    return { error: "Film storage isn't available right now." };
  }

  try {
    return { error: null, url: await presignRead(video.path) };
  } catch {
    return { error: "Couldn't open the film. Try again in a moment." };
  }
}
