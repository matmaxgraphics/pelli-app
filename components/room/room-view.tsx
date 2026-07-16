"use client";

import { useRoomLive } from "@/hooks/use-room-live";
import { RoomLobby } from "./room-lobby";
import { Player } from "./player";
import type { RoomWithParticipants } from "@/types/room";

/**
 * The live room. Owns the one Realtime subscription and decides what to show:
 * the lobby until a film is chosen, then the player. Host and guest both flip
 * to the player off the same room UPDATE, so nobody has to refresh.
 */
export function RoomView({
  code,
  inviteUrl,
  initialRoom,
  youId,
  isHost,
}: {
  code: string;
  inviteUrl: string;
  initialRoom: RoomWithParticipants;
  youId: string | null;
  isHost: boolean;
}) {
  const live = useRoomLive(code, initialRoom);

  if (live.video) {
    return (
      <Player
        code={code}
        isHost={isHost}
        video={live.video}
        playback={live.playback}
        participants={live.participants}
        youId={youId}
      />
    );
  }

  return (
    <RoomLobby
      code={code}
      inviteUrl={inviteUrl}
      participants={live.participants}
      youId={youId}
      isHost={isHost}
    />
  );
}
