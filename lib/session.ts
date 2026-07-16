import "server-only";

import { cookies } from "next/headers";
import { isAvatarColorId } from "@/constants/avatar-colors";
import type { GuestIdentity } from "@/types/room";
import { normalizeRoomCode } from "@/utils/room-code";

/**
 * Anonymous session, held in cookies.
 *
 * Cookies rather than localStorage so the room renders server-side already
 * knowing who you are — no flash of "who are you?" before hydration. There is
 * no account here: the cookie only says which seat in which room is yours.
 */

const IDENTITY_COOKIE = "pelli_identity";
const SEAT_PREFIX = "pelli_seat_";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const baseCookie = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

function seatCookieName(code: string): string {
  return `${SEAT_PREFIX}${normalizeRoomCode(code)}`;
}

/** Remember name + color so the next room doesn't ask twice. */
export async function rememberIdentity(identity: GuestIdentity): Promise<void> {
  const store = await cookies();
  store.set(IDENTITY_COOKIE, JSON.stringify(identity), {
    ...baseCookie,
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function recallIdentity(): Promise<GuestIdentity | null> {
  const store = await cookies();
  const raw = store.get(IDENTITY_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "name" in parsed &&
      "color" in parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.color === "string" &&
      isAvatarColorId(parsed.color)
    ) {
      return { name: parsed.name, color: parsed.color };
    }
  } catch {
    // A malformed cookie just means we ask again. Not worth surfacing.
  }
  return null;
}

/** Claim a seat: this participant row is me, in this room. */
export async function saveSeat(
  code: string,
  participantId: string,
): Promise<void> {
  const store = await cookies();
  store.set(seatCookieName(code), participantId, {
    ...baseCookie,
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function recallSeat(code: string): Promise<string | null> {
  const store = await cookies();
  return store.get(seatCookieName(code))?.value ?? null;
}
