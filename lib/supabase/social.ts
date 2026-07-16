import { getSupabaseBrowserClient } from "./client";
import { normalizeRoomCode } from "@/utils/room-code";
import type { Me } from "@/types/chat";

/**
 * Client-side writes for chat and reactions.
 *
 * Inserted straight from the browser (RLS permits it — the room code is the
 * credential), the same low-latency pattern as playback persistence. The author
 * is `me`, which the server established from the seat cookie at page load.
 */

export const MAX_MESSAGE_LENGTH = 500;

export async function insertMessage(params: {
  id: string;
  roomCode: string;
  me: Me;
  body: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("messages").insert({
    id: params.id,
    room_code: normalizeRoomCode(params.roomCode),
    participant_id: params.me.id,
    author_name: params.me.name,
    author_color: params.me.color,
    body: params.body.trim().slice(0, MAX_MESSAGE_LENGTH),
  });
  if (error) throw new Error(error.message);
}

export async function insertReaction(params: {
  roomCode: string;
  me: Me;
  emoji: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("reactions").insert({
    room_code: normalizeRoomCode(params.roomCode),
    participant_id: params.me.id,
    emoji: params.emoji,
  });
  if (error) throw new Error(error.message);
}
