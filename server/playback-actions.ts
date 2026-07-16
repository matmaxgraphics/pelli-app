"use server";

import { getRoom, setRoomVideo } from "@/services/rooms";
import { recallSeat } from "@/lib/session";
import { isValidRoomCode } from "@/utils/room-code";
import type { RoomVideo } from "@/types/room";

/**
 * Set the film for a room.
 *
 * Called imperatively (not from a form) because an upload finishes client-side
 * first, then hands us the resulting URL. Host-only: the seat cookie must match
 * the room's host, so a guest can't hijack what everyone's watching.
 */

export interface SetVideoResult {
  error: string | null;
}

const MAX_URL_LENGTH = 2048;

export async function setVideoAction(input: {
  code: string;
  url: string;
  name: string;
  path: string | null;
}): Promise<SetVideoResult> {
  if (!isValidRoomCode(input.code)) {
    return { error: "That room code isn't valid." };
  }

  const url = input.url.trim();
  const isUpload = input.path !== null;

  // An external link must be a plain http(s) URL. Uploaded files already have a
  // trusted Storage URL, so only validate the paste path strictly.
  if (!isUpload) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { error: "That doesn't look like a link. Paste a full https:// URL." };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { error: "Links need to start with http:// or https://." };
    }
    if (url.length > MAX_URL_LENGTH) {
      return { error: "That link is too long." };
    }
  }

  const seat = await recallSeat(input.code);
  if (!seat) {
    return { error: "Only the host can choose the film, and you're not seated as host." };
  }

  const room = await getRoom(input.code);
  if (!room) {
    return { error: "That room isn't here anymore." };
  }

  const host = room.participants.find((p) => p.role === "host");
  if (!host || host.id !== seat) {
    return { error: "Only the host can choose the film." };
  }

  const video: RoomVideo = {
    url,
    name: input.name.trim() || "Tonight's film",
    path: input.path,
  };

  await setRoomVideo(input.code, video);
  return { error: null };
}
