/**
 * The wire format for playback sync. These travel over the Supabase Realtime
 * broadcast channel `room-playback:<code>`.
 *
 * Positions are compared, never wall-clocks: the host and guest are on
 * different machines with different clocks, but they share one video timeline.
 * So every message carries a `position` (seconds into the film) and we reconcile
 * on that alone. Network latency (tens of ms) is well inside the 500ms budget.
 */

export type PlaybackAction = "play" | "pause" | "seek";

/** A discrete thing the host did. Broadcast the instant it happens. */
export interface ControlEvent {
  action: PlaybackAction;
  /** Seconds into the film at the moment the host acted. */
  position: number;
}

/** The host's current state, broadcast on a timer so guests can drift-correct. */
export interface HeartbeatEvent {
  position: number;
  isPlaying: boolean;
}

export const PLAYBACK_EVENT = {
  control: "control",
  heartbeat: "heartbeat",
} as const;
