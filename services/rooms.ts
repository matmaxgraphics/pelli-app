import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateRoomCode, normalizeRoomCode } from "@/utils/room-code";
import { isRoomFull, ROOM_FULL_MESSAGE } from "@/utils/room-capacity";
import { rowToVideo } from "@/utils/room-video";
import type {
  GuestIdentity,
  Participant,
  ParticipantRole,
  RoomVideo,
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
  video_url: string | null;
  video_name: string | null;
  video_path: string | null;
  playback_position: number;
  is_playing: boolean;
  playback_updated_at: string | null;
}

/** Every column getRoom reads. Kept as one string so the shape is in one place. */
const ROOM_COLUMNS =
  "code, status, created_at, video_url, video_name, video_path, playback_position, is_playing, playback_updated_at";

function toRoom(row: RoomRow, participants: Participant[]): RoomWithParticipants {
  return {
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    video: rowToVideo(row),
    playback: {
      position: row.playback_position ?? 0,
      isPlaying: row.is_playing ?? false,
      updatedAt: row.playback_updated_at,
    },
    participants,
  };
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
    readonly kind:
      | "not_found"
      | "name_taken"
      | "color_taken"
      | "room_full"
      | "unavailable",
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
    throw joinFailure(error);
  }

  return toParticipant(data);
}

/**
 * Turn a failed participant insert into something a person can act on. The
 * database is the real gatekeeper (capacity trigger, per-room unique color and
 * name), so this is where its refusals get their wording.
 */
function joinFailure(error: { code?: string; message: string } | null): RoomError {
  const message = error?.message ?? "unknown error";

  if (message.includes("room_full")) {
    return new RoomError(ROOM_FULL_MESSAGE, "room_full");
  }
  if (error?.code === UNIQUE_VIOLATION) {
    if (message.includes("participants_room_color_uniq")) {
      return new RoomError(
        "Someone just took that color. Pick another.",
        "color_taken",
      );
    }
    if (message.includes("participants_room_name_uniq")) {
      return new RoomError(
        "Someone in this room already has that name. Try another.",
        "name_taken",
      );
    }
  }
  return new RoomError(`Could not join the room: ${message}`, "unavailable");
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

  // These checks give the friendly answer early. They are not the gate: two
  // simultaneous joins can both pass them, so the database enforces the same
  // rules and addParticipant maps its refusals to the same errors.
  if (isRoomFull(room.participants.length)) {
    throw new RoomError(ROOM_FULL_MESSAGE, "room_full");
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

  if (room.participants.some((p) => p.color === identity.color)) {
    throw new RoomError(
      "Someone in this room already has that color. Pick another.",
      "color_taken",
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
    .select(ROOM_COLUMNS)
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

  return toRoom(room, (participants ?? []).map(toParticipant));
}

/**
 * Set the film for a room and move it to "watching". Resets playback to the
 * start so both people begin together. Only the host reaches this.
 */
export async function setRoomVideo(
  rawCode: string,
  video: RoomVideo,
): Promise<void> {
  const code = normalizeRoomCode(rawCode);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("rooms")
    .update({
      // A link has a URL and no key; an upload has a key and no stored URL
      // (viewers are handed a signed one). Exactly one of the two is set.
      video_url: video.kind === "link" ? video.url : null,
      video_name: video.name,
      video_path: video.kind === "upload" ? video.path : null,
      status: "watching",
      playback_position: 0,
      is_playing: false,
      playback_updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) {
    throw new RoomError(
      `Could not set the film: ${error.message}`,
      "unavailable",
    );
  }
}

/**
 * Persist a playback snapshot on a discrete control event (play/pause/seek).
 * Not called on every heartbeat — this is the refresh/late-join fallback, and
 * live sync rides Realtime broadcast instead.
 */
export async function updatePlayback(
  rawCode: string,
  snapshot: { position: number; isPlaying: boolean },
): Promise<void> {
  const code = normalizeRoomCode(rawCode);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("rooms")
    .update({
      playback_position: snapshot.position,
      is_playing: snapshot.isPlaying,
      playback_updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) {
    throw new RoomError(
      `Could not sync playback: ${error.message}`,
      "unavailable",
    );
  }
}

/** End the night — move the room to "ended" so everyone sees the Summary. */
export async function endRoom(rawCode: string): Promise<void> {
  const code = normalizeRoomCode(rawCode);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("rooms")
    .update({ status: "ended", is_playing: false })
    .eq("code", code);

  if (error) {
    throw new RoomError(
      `Could not end the night: ${error.message}`,
      "unavailable",
    );
  }
}
