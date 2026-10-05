import { isObjectKey } from "./object-key";
import type { RoomVideo } from "@/types/room";

/** The three columns that describe a room's film. */
export interface VideoColumns {
  video_url: string | null;
  video_name: string | null;
  video_path: string | null;
}

/**
 * Row -> RoomVideo, shared by the server (initial render) and the browser
 * (Realtime updates) so both read the same columns the same way.
 *
 * A valid object key means an upload. Anything else with a URL is a link —
 * including rooms from before films moved to R2, whose old Supabase-hosted
 * path isn't a key but whose URL still plays.
 */
export function rowToVideo(row: VideoColumns): RoomVideo | null {
  const name = row.video_name ?? "Tonight's film";

  if (row.video_path && isObjectKey(row.video_path)) {
    return { kind: "upload", url: null, name, path: row.video_path };
  }
  if (row.video_url) {
    return { kind: "link", url: row.video_url, name, path: null };
  }
  return null;
}

/**
 * Whether two readings describe the same film. The room row updates on every
 * play, pause and seek, and each update would otherwise hand the UI a brand-new
 * (equal) object — keeping the old one means nothing downstream re-renders or
 * refetches a signed URL for a film that hasn't changed.
 */
export function sameVideo(a: RoomVideo | null, b: RoomVideo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.kind === b.kind &&
    a.url === b.url &&
    a.path === b.path &&
    a.name === b.name
  );
}
