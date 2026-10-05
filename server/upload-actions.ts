"use server";

import { isR2Configured } from "@/lib/r2-env";
import { requireHost } from "@/lib/room-access";
import { newFilmKey, presignUpload } from "@/services/storage";
import { resolveVideoType, validateVideoFile } from "@/utils/video-file";

/**
 * Step one of an upload: ask permission.
 *
 * The browser sends the film straight to R2 (a film is far too big to pass
 * through a server action), but it may only do so with a URL signed here. That
 * makes this the gate: only the host of a live room gets one, for a file that
 * is a plausible size and type, under a key that belongs to that room.
 */

export interface CreateUploadInput {
  code: string;
  fileName: string;
  contentType: string;
  size: number;
}

export type CreateUploadResult =
  | { error: string }
  | { error: null; uploadUrl: string; key: string; contentType: string };

export async function createUploadAction(
  input: CreateUploadInput,
): Promise<CreateUploadResult> {
  if (!isR2Configured()) {
    return { error: "Uploads aren't set up yet. Paste a link instead." };
  }

  const guard = await requireHost(String(input.code), "upload the film");
  if (!guard.ok) return { error: guard.error };
  const { code, room } = guard.seat;

  if (room.status === "ended") {
    return { error: "This night has already ended." };
  }

  const fileName = String(input.fileName ?? "");
  const declaredType = String(input.contentType ?? "");
  const size = Number(input.size);

  if (!Number.isFinite(size)) {
    return { error: "Couldn't read that file's size." };
  }
  const problem = validateVideoFile({ name: fileName, type: declaredType, size });
  if (problem) return { error: problem };

  const resolved = resolveVideoType(fileName, declaredType);
  if (!resolved) {
    return { error: "That's not a video Pelli can play. Use an MP4 or WebM." };
  }

  try {
    const key = newFilmKey(code, resolved.extension);
    const uploadUrl = await presignUpload(key);
    return { error: null, uploadUrl, key, contentType: resolved.contentType };
  } catch {
    return { error: "Couldn't start the upload. Try again in a moment." };
  }
}
