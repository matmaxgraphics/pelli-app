import type { AvatarColorId } from "@/constants/avatar-colors";

/** Shared room + identity types. Mirrors the Supabase schema in supabase/schema.sql. */

export type ParticipantRole = "host" | "guest";

export type RoomStatus = "waiting" | "watching" | "ended";

/** A person in a room. Anonymous by design — a name and a color, no account. */
export interface Participant {
  id: string;
  roomCode: string;
  name: string;
  /** One of AVATAR_COLORS.id — never a raw hex, so the palette stays closed. */
  color: AvatarColorId;
  role: ParticipantRole;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  createdAt: string;
}

/** A room plus everyone currently in it. */
export interface RoomWithParticipants extends Room {
  participants: Participant[];
}

/** What someone fills in before entering a room. */
export interface GuestIdentity {
  name: string;
  color: AvatarColorId;
}
