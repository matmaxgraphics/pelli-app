"use server";

import { redirect } from "next/navigation";
import { createRoom, joinRoom, roomExists, RoomError } from "@/services/rooms";
import { rememberIdentity, saveSeat } from "@/lib/session";
import { isAvatarColorId } from "@/constants/avatar-colors";
import { isValidRoomCode, normalizeRoomCode } from "@/utils/room-code";
import type { GuestIdentity } from "@/types/room";
import type { RoomFormState } from "@/types/room-form";

/**
 * Server actions for room creation and joining.
 *
 * Both return a plain message on failure rather than throwing, so the form can
 * say something useful in place instead of blowing up to an error boundary.
 * Errors give direction, not mood (rules.md §3).
 */

const MAX_NAME_LENGTH = 24;

type ParsedIdentity =
  | { ok: true; identity: GuestIdentity }
  | { ok: false; error: string };

function parseIdentity(formData: FormData): ParsedIdentity {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");

  if (!name) {
    return { ok: false, error: "Add your name so your person knows who's here." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `That name is a little long — ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (!isAvatarColorId(color)) {
    return { ok: false, error: "Pick a color so we can tell you apart." };
  }

  return { ok: true, identity: { name, color } };
}

export async function createRoomAction(
  _prevState: RoomFormState,
  formData: FormData,
): Promise<RoomFormState> {
  const parsed = parseIdentity(formData);
  if (!parsed.ok) return { error: parsed.error };

  let code: string;
  try {
    const room = await createRoom(parsed.identity);
    code = room.code;
    await saveSeat(room.code, room.participant.id);
    await rememberIdentity(parsed.identity);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }

  // redirect() signals by throwing, so it must sit outside the try.
  redirect(`/room/${code}`);
}

export async function joinRoomAction(
  _prevState: RoomFormState,
  formData: FormData,
): Promise<RoomFormState> {
  const rawCode = String(formData.get("code") ?? "");

  if (!isValidRoomCode(rawCode)) {
    return { error: "That doesn't look like a room code. It's six characters." };
  }

  const parsed = parseIdentity(formData);
  if (!parsed.ok) return { error: parsed.error };

  let code: string;
  try {
    const room = await joinRoom(rawCode, parsed.identity);
    code = room.code;
    await saveSeat(room.code, room.participant.id);
    await rememberIdentity(parsed.identity);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }

  redirect(`/room/${code}`);
}

/** Step one of joining: check the code before asking for a name. */
export async function checkRoomCodeAction(
  _prevState: RoomFormState,
  formData: FormData,
): Promise<RoomFormState> {
  const rawCode = String(formData.get("code") ?? "");

  if (!isValidRoomCode(rawCode)) {
    return { error: "That doesn't look like a room code. It's six characters." };
  }

  try {
    if (!(await roomExists(rawCode))) {
      return {
        error: "No room with that code. Double-check it with your person.",
      };
    }
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }

  redirect(`/join/${normalizeRoomCode(rawCode)}`);
}
