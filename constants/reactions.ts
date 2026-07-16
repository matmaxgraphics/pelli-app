/**
 * The reaction set. Small and warm — the feelings you have watching a film with
 * someone, not a full emoji keyboard. Order is the order they appear in the bar.
 */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

/** How long a floating reaction lives on screen before it's cleaned up (ms). */
export const REACTION_FLOAT_MS = 2600;
