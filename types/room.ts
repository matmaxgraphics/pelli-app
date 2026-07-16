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

/** The film a room is watching, plus the last playback snapshot we persisted. */
export interface RoomVideo {
  /** Playable URL — a Supabase Storage public URL, or an external MP4 link. */
  url: string;
  /** Human label shown in the UI (the filename, or the host's title). */
  name: string;
  /** Storage object path when uploaded; null for an external URL. */
  path: string | null;
}

/** Last known playback state, persisted so a refresh or late join lands right. */
export interface PlaybackSnapshot {
  position: number;
  isPlaying: boolean;
  /** Server timestamp of the last discrete control event. */
  updatedAt: string | null;
}

export interface Room {
  code: string;
  status: RoomStatus;
  createdAt: string;
  video: RoomVideo | null;
  playback: PlaybackSnapshot;
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
