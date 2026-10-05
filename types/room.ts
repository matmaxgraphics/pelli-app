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
  /**
   * "link" plays a pasted URL as-is. "upload" is a file we store: it has no
   * permanent URL, because each viewer is handed a short-lived signed one.
   */
  kind: "link" | "upload";
  /** The playable URL for a link; null for an upload. */
  url: string | null;
  /** Human label shown in the UI (the filename, or the host's title). */
  name: string;
  /** Storage object key for an upload; null for a link. */
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
