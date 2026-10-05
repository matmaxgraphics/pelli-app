/** Tuning for playback sync and uploads. One place, so the demo is easy to tune. */

/** How often the host broadcasts its position while playing. */
export const HEARTBEAT_MS = 1500;

/**
 * Seconds of drift a guest tolerates before hard-seeking to the host. rules.md
 * §4 targets < 500ms; this is the correction trigger, kept just under it.
 */
export const DRIFT_THRESHOLD_SECONDS = 0.5;

/**
 * After a hard seek, ignore drift for a moment: the browser needs time to land
 * on the new frame, and measuring mid-seek would trigger a second correction.
 */
export const SEEK_SETTLE_MS = 400;

/**
 * The largest film a host can upload. This one number is the whole policy:
 * raising it is the only change needed up to 5 GB, because R2 accepts a single
 * presigned PUT that large. Past 5 GB the upload would have to become a
 * multipart upload — which is the only reason to ever touch the upload code.
 */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const ACCEPTED_VIDEO_EXTENSIONS = ".mp4,.webm";

/** Both in seconds. Generous: a slow home upload shouldn't expire mid-flight. */
export const UPLOAD_URL_TTL_SECONDS = 2 * 60 * 60;
/** Long enough for any film plus pauses; refreshed on demand if it ever lapses. */
export const READ_URL_TTL_SECONDS = 12 * 60 * 60;
