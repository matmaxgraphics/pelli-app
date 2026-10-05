import {
  ACCEPTED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/constants/playback";
import type { VideoExtension } from "./object-key";

/** Pure helpers for choosing a film file. Used by the form and the server. */

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

export const MAX_UPLOAD_MB = mb(MAX_UPLOAD_BYTES);

/** mp4 or webm from a filename, or null for anything else. */
export function extensionOfName(fileName: string): VideoExtension | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext === "mp4" || ext === "webm" ? ext : null;
}

/**
 * The container we'll store it as. Prefer what the browser says the file is;
 * fall back to the extension, since some browsers report an empty type.
 */
export function resolveVideoType(
  fileName: string,
  declaredType: string,
): { extension: VideoExtension; contentType: string } | null {
  if (declaredType === "video/mp4") return { extension: "mp4", contentType: declaredType };
  if (declaredType === "video/webm") return { extension: "webm", contentType: declaredType };

  if (!declaredType) {
    const extension = extensionOfName(fileName);
    if (extension) {
      return { extension, contentType: `video/${extension}` };
    }
  }
  return null;
}

/** A sentence for the person, or null when the file is fine. */
export function validateVideoFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size <= 0) return "That file looks empty.";

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is over ${MAX_UPLOAD_MB} MB. Try a smaller version, or paste a link instead.`;
  }

  const resolved = resolveVideoType(file.name, file.type);
  if (!resolved || !ACCEPTED_VIDEO_TYPES.includes(resolved.contentType as (typeof ACCEPTED_VIDEO_TYPES)[number])) {
    return "That's not a video Pelli can play. Use an MP4 or WebM.";
  }
  return null;
}

/** "Interstellar.2014.mp4" -> "Interstellar.2014" */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,5}$/i, "").trim() || "Tonight's film";
}
