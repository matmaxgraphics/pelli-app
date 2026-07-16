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

/** Upload constraints. The free Storage tier caps files at ~50MB; stay under. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const ACCEPTED_VIDEO_EXTENSIONS = ".mp4,.webm";

/** The Storage bucket uploaded films live in (see supabase/schema.sql). */
export const MOVIES_BUCKET = "movies";
