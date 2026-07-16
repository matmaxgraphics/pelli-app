"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AvatarColorId } from "@/constants/avatar-colors";
import type { Participant } from "@/types/room";

interface ParticipantRow {
  id: string;
  room_code: string;
  name: string;
  color: string;
  role: Participant["role"];
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

/**
 * Live list of who's in the room.
 *
 * Seeded from the server render so the list is correct on first paint, then
 * kept current over Realtime — the host watches their person appear without
 * touching anything, which is the whole point of the lobby.
 */
export function useRoomParticipants(
  code: string,
  initial: Participant[],
): Participant[] {
  // Seeded once. Deliberately not re-synced from `initial`: it is a fresh array
  // on every parent render, so syncing would clobber anyone Realtime has added.
  const [participants, setParticipants] = useState<Participant[]>(initial);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`room-participants:${code}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          const joined = toParticipant(payload.new as ParticipantRow);
          setParticipants((current) =>
            // The person who just joined already has themselves from the
            // server render; don't seat them twice.
            current.some((p) => p.id === joined.id)
              ? current
              : [...current, joined].sort((a, b) =>
                  a.joinedAt.localeCompare(b.joinedAt),
                ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code]);

  return participants;
}
