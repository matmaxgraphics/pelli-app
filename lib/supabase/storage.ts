import { getSupabaseBrowserClient } from "./client";
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
  MOVIES_BUCKET,
} from "@/constants/playback";

/**
 * Upload a film straight from the browser to Storage.
 *
 * Client-side on purpose: a movie is far too big to pass through a server
 * action (they have a small body cap), and Storage handles the transfer with a
 * resumable-friendly PUT. The room only ever records the resulting URL.
 */

export interface UploadedMovie {
  path: string;
  url: string;
  name: string;
}

/** A short, stable id without pulling in a uuid dependency. */
function randomId(): string {
  return crypto.randomUUID();
}

function extensionFor(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
}

export function validateVideoFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return `That file is over ${mb}MB. Try a shorter clip, or paste a link instead.`;
  }
  if (
    file.type &&
    !ACCEPTED_VIDEO_TYPES.includes(file.type as (typeof ACCEPTED_VIDEO_TYPES)[number])
  ) {
    return "That's not a video Pelli can play. Use an MP4 or WebM.";
  }
  return null;
}

export async function uploadMovie(
  file: File,
  roomCode: string,
): Promise<UploadedMovie> {
  const supabase = getSupabaseBrowserClient();
  const path = `${roomCode}/${randomId()}.${extensionFor(file)}`;

  const { error } = await supabase.storage
    .from(MOVIES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(MOVIES_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, name: file.name };
}
