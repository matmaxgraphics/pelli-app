import type { AvatarColorId } from "@/constants/avatar-colors";

/** A chat message. Author name/color are denormalized (see supabase/schema.sql). */
export interface ChatMessage {
  id: string;
  roomCode: string;
  participantId: string | null;
  authorName: string;
  authorColor: AvatarColorId;
  body: string;
  createdAt: string;
}

/** Who "I" am, passed to the client so it can author messages and reactions. */
export interface Me {
  id: string;
  name: string;
  color: AvatarColorId;
}

/** Ephemeral "X is typing" ping — broadcast, never stored. */
export interface TypingSignal {
  participantId: string;
  name: string;
}

/** A reaction to float. Broadcast for the animation; also persisted for the tally. */
export interface ReactionSignal {
  /** Unique per emit, so the floating animation has a stable key. */
  id: string;
  emoji: string;
  participantId: string;
  color: AvatarColorId;
}

/** Broadcast event names on the social channel. */
export const SOCIAL_EVENT = {
  typing: "typing",
  reaction: "reaction",
} as const;
