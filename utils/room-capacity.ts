import { MAX_PARTICIPANTS } from "@/constants/room";

/** Pure helpers, so server pages, actions and client UI agree on "full". */

export function isRoomFull(headcount: number): boolean {
  return headcount >= MAX_PARTICIPANTS;
}

export function spotsLeft(headcount: number): number {
  return Math.max(0, MAX_PARTICIPANTS - headcount);
}

/** The one sentence everywhere that has to say no. */
export const ROOM_FULL_MESSAGE = `This room is full — it holds up to ${MAX_PARTICIPANTS} people.`;
