"use client";

import { useRoomLive } from "@/hooks/use-room-live";
import { RoomLobby } from "./room-lobby";
import { Player } from "./player";
import { NightSummary } from "./night-summary";
import type { RoomWithParticipants } from "@/types/room";
import type { ChatMessage, Me } from "@/types/chat";

/**
 * The live room. Owns the one Realtime subscription and decides what to show:
 * the lobby until a film is chosen, the player while watching, and the Summary
 * once the night ends. Every transition happens for both people off the same
 * room UPDATE, so nobody has to refresh.
 */
export function RoomView({
  code,
  inviteUrl,
  initialRoom,
  me,
  isHost,
  initialMessages,
}: {
  code: string;
  inviteUrl: string;
  initialRoom: RoomWithParticipants;
  me: Me;
  isHost: boolean;
  initialMessages: ChatMessage[];
}) {
  const live = useRoomLive(code, initialRoom);

  if (live.status === "ended") {
    return (
      <NightSummary
        code={code}
        video={live.video}
        participants={live.participants}
        watchedAt={initialRoom.createdAt}
      />
    );
  }

  if (live.video) {
    return (
      <Player
        code={code}
        isHost={isHost}
        me={me}
        video={live.video}
        playback={live.playback}
        participants={live.participants}
        initialMessages={initialMessages}
      />
    );
  }

  return (
    <RoomLobby
      code={code}
      inviteUrl={inviteUrl}
      participants={live.participants}
      youId={me.id}
      isHost={isHost}
    />
  );
}
