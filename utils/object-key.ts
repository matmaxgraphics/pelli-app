/**
 * Storage object keys for uploaded films: rooms/<ROOMCODE>/<uuid>.<ext>
 *
 * The key is the only thing the database keeps about an upload, and the only
 * thing a client can ask the server to act on, so its shape is validated
 * strictly in one place. It also ties every object to a room: a host can never
 * point their room at someone else's file.
 */

const KEY_PATTERN =
  /^rooms\/([A-Z0-9]{6})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$/;

export type VideoExtension = "mp4" | "webm";

export function isObjectKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

/** The room an object key belongs to, or null if it isn't a valid key. */
export function roomOfObjectKey(key: string): string | null {
  return KEY_PATTERN.exec(key)?.[1] ?? null;
}

export function buildObjectKey(
  roomCode: string,
  extension: VideoExtension,
): string {
  return `rooms/${roomCode}/${crypto.randomUUID()}.${extension}`;
}
