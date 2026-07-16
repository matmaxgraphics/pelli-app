"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AvatarColorId } from "@/constants/avatar-colors";
import type {
  Participant,
  PlaybackSnapshot,
  RoomStatus,
  RoomVideo,
  RoomWithParticipants,
} from "@/types/room";

interface ParticipantRow {
  id: string;
  room_code: string;
  name: string;
  color: string;
  role: Participant["role"];
  joined_at: string;
}

interface RoomRow {
  status: RoomStatus;
  video_url: string | null;
  video_name: string | null;
  video_path: string | null;
  playback_position: number;
  is_playing: boolean;
  playback_updated_at: string | null;
}

export interface LiveRoom {
  participants: Participant[];
  status: RoomStatus;
  video: RoomVideo | null;
  /** Persisted snapshot — the refresh/late-join anchor, not the live position. */
  playback: PlaybackSnapshot;
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
 * One live view of a room: who's here, what's playing, and the last persisted
 * playback snapshot. Seeded from the server render, then kept current over a
 * single Realtime channel.
 *
 * This carries the *discrete* transitions — someone joins, the host picks a
 * film. Frame-by-frame position sync is a separate, higher-frequency concern
 * handled by usePlaybackSync over broadcast.
 */
export function useRoomLive(
  code: string,
  initial: RoomWithParticipants,
): LiveRoom {
  const [state, setState] = useState<LiveRoom>({
    participants: initial.participants,
    status: initial.status,
    video: initial.video,
    playback: initial.playback,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`room:${code}`)
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
          setState((current) =>
            current.participants.some((p) => p.id === joined.id)
              ? current
              : {
                  ...current,
                  participants: [...current.participants, joined].sort((a, b) =>
                    a.joinedAt.localeCompare(b.joinedAt),
                  ),
                },
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          const row = payload.new as RoomRow;
          setState((current) => ({
            ...current,
            status: row.status,
            video: row.video_url
              ? {
                  url: row.video_url,
                  name: row.video_name ?? "Tonight's film",
                  path: row.video_path,
                }
              : null,
            playback: {
              position: row.playback_position ?? 0,
              isPlaying: row.is_playing ?? false,
              updatedAt: row.playback_updated_at,
            },
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code]);

  return state;
}
