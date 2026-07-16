import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RoomView } from "@/components/room/room-view";
import { getRoom } from "@/services/rooms";
import { recallSeat } from "@/lib/session";
import { getRequestOrigin } from "@/lib/origin";
import { isValidRoomCode, normalizeRoomCode } from "@/utils/room-code";

export const metadata: Metadata = {
  title: "Movie night",
  // A room is private-by-code; keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function RoomPage(props: PageProps<"/room/[code]">) {
  const { code: rawCode } = await props.params;

  if (!isValidRoomCode(rawCode)) notFound();
  const code = normalizeRoomCode(rawCode);

  const room = await getRoom(code);
  if (!room) notFound();

  // No seat means you haven't said who you are yet — you can't be present in a
  // room anonymously when the whole point is that the other person sees you.
  const seat = await recallSeat(code);
  const you = room.participants.find((p) => p.id === seat);
  if (!you) redirect(`/join/${code}`);

  const inviteUrl = `${await getRequestOrigin()}/join/${code}`;

  return (
    <main className="flex-1">
      <RoomView
        code={code}
        inviteUrl={inviteUrl}
        initialRoom={room}
        youId={you.id}
        isHost={you.role === "host"}
      />
    </main>
  );
}
