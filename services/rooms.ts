import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateRoomCode, normalizeRoomCode } from "@/utils/room-code";
import type {
  GuestIdentity,
  Participant,
  ParticipantRole,
  RoomWithParticipants,
  RoomStatus,
} from "@/types/room";
import type { AvatarColorId } from "@/constants/avatar-colors";

/**
 * The only place that talks to the rooms tables. Routes and actions go through
 * here so the storage choice stays swappable and the row<->type mapping lives
 * in exactly one file.
 */

/** Postgres unique-violation. Used to detect a room-code collision. */
const UNIQUE_VIOLATION = "23505";

/** 30^6 codes means collisions are vanishingly rare; a few retries is plenty. */
const MAX_CODE_ATTEMPTS = 5;

interface RoomRow {
  code: string;
  status: RoomStatus;
  created_at: string;
}

interface ParticipantRow {
  id: string;
  room_code: string;
  name: string;
  color: string;
  role: ParticipantRole;
  joined_at: string;
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    roomCode: row.room_code,
    name: row.name,
    color: row.color as AvatarColorId,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

/** Thrown for conditions the UI is expected to explain to a person. */
export class RoomError extends Error {
  constructor(
    message: string,
    readonly kind: "not_found" | "name_taken" | "unavailable",
  ) {
    super(message);
    this.name = "RoomError";
  }
}

/** Reserve an unused room code. Retries only on a genuine collision. */
async function reserveRoomCode(): Promise<string> {
  const supabase = createSupabaseServerClient();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from("rooms").insert({ code });

    if (!error) return code;
    if (error.code !== UNIQUE_VIOLATION) {
      throw new RoomError(
        `Could not create the room: ${error.message}`,
        "unavailable",
      );
    }
  }

  throw new RoomError(
    "Could not find a free room code. Please try again.",
    "unavailable",
  );
}

async function addParticipant(
  roomCode: string,
  identity: GuestIdentity,
  role: ParticipantRole,
): Promise<Participant> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("participants")
    .insert({
      room_code: roomCode,
      name: identity.name.trim(),
      color: identity.color,
      role,
    })
    .select()
    .single<ParticipantRow>();

  if (error || !data) {
    throw new RoomError(
      `Could not join the room: ${error?.message ?? "unknown error"}`,
      "unavailable",
    );
  }

  return toParticipant(data);
}

/** Create a room and seat the host in it. */
export async function createRoom(
  identity: GuestIdentity,
): Promise<{ code: string; participant: Participant }> {
  const code = await reserveRoomCode();
  const participant = await addParticipant(code, identity, "host");
  return { code, participant };
}

/** Seat a guest in an existing room. */
export async function joinRoom(
  rawCode: string,
  identity: GuestIdentity,
): Promise<{ code: string; participant: Participant }> {
  const code = normalizeRoomCode(rawCode);
  const room = await getRoom(code);

  if (!room) {
    throw new RoomError(
      "That room code doesn't match a room. Check it and try again.",
      "not_found",
    );
  }

  // Two identical names on one playhead makes presence unreadable — and the
  // whole product is knowing who is who.
  const taken = room.participants.some(
    (p) => p.name.toLowerCase() === identity.name.trim().toLowerCase(),
  );
  if (taken) {
    throw new RoomError(
      `Someone in this room is already called ${identity.name.trim()}. Try another name.`,
      "name_taken",
    );
  }

  const participant = await addParticipant(code, identity, "guest");
  return { code, participant };
}

/** A room and everyone in it, oldest first (the host leads). */
export async function getRoom(
  rawCode: string,
): Promise<RoomWithParticipants | null> {
  const code = normalizeRoomCode(rawCode);
  const supabase = createSupabaseServerClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("code, status, created_at")
    .eq("code", code)
    .maybeSingle<RoomRow>();

  if (roomError) {
    throw new RoomError(
      `Could not load the room: ${roomError.message}`,
      "unavailable",
    );
  }
  if (!room) return null;

  const { data: participants, error: participantsError } = await supabase
    .from("participants")
    .select("id, room_code, name, color, role, joined_at")
    .eq("room_code", code)
    .order("joined_at", { ascending: true })
    .returns<ParticipantRow[]>();

  if (participantsError) {
    throw new RoomError(
      `Could not load who's here: ${participantsError.message}`,
      "unavailable",
    );
  }

  return {
    code: room.code,
    status: room.status,
    createdAt: room.created_at,
    participants: (participants ?? []).map(toParticipant),
  };
}

/** Whether a code corresponds to a real room. Used by the join form. */
export async function roomExists(rawCode: string): Promise<boolean> {
  return (await getRoom(rawCode)) !== null;
}
