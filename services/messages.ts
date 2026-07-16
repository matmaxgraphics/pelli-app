import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeRoomCode } from "@/utils/room-code";
import type { ChatMessage } from "@/types/chat";
import type { AvatarColorId } from "@/constants/avatar-colors";

/** Server-side reads for chat history. Live delivery is postgres_changes. */

interface MessageRow {
  id: string;
  room_code: string;
  participant_id: string | null;
  author_name: string;
  author_color: string;
  body: string;
  created_at: string;
}

export const MESSAGE_COLUMNS =
  "id, room_code, participant_id, author_name, author_color, body, created_at";

export function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomCode: row.room_code,
    participantId: row.participant_id,
    authorName: row.author_name,
    authorColor: row.author_color as AvatarColorId,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Chat history for a room, oldest first. Bounded so a long night stays cheap. */
export async function getMessages(
  rawCode: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const code = normalizeRoomCode(rawCode);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("room_code", code)
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<MessageRow[]>();

  if (error) {
    throw new Error(`Could not load the chat: ${error.message}`);
  }

  return (data ?? []).map(toMessage);
}
