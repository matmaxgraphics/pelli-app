/**
 * The closed set of identity colors. Warm and desaturated so they sit beside
 * the coral accent instead of fighting it — no neon, per rules.md §3.
 *
 * A person is a name and one of these colors. That's the whole identity model.
 * Stored by `id`, never by hex, so the palette can be retuned without a
 * migration.
 */

export const AVATAR_COLORS = [
  { id: "coral", label: "Coral", hex: "#EC6A5E" },
  { id: "amber", label: "Amber", hex: "#C2843A" },
  { id: "moss", label: "Moss", hex: "#6B7F5B" },
  { id: "teal", label: "Teal", hex: "#4A7C7E" },
  { id: "plum", label: "Plum", hex: "#8A5A7A" },
  { id: "stone", label: "Stone", hex: "#57534E" },
] as const;

export type AvatarColorId = (typeof AVATAR_COLORS)[number]["id"];

const COLOR_BY_ID = new Map<string, (typeof AVATAR_COLORS)[number]>(
  AVATAR_COLORS.map((c) => [c.id, c]),
);

export function isAvatarColorId(value: string): value is AvatarColorId {
  return COLOR_BY_ID.has(value);
}

/** Resolve an id to its hex. Falls back to coral so UI never renders colorless. */
export function avatarHex(id: AvatarColorId | string): string {
  return COLOR_BY_ID.get(id)?.hex ?? AVATAR_COLORS[0].hex;
}

export function avatarLabel(id: AvatarColorId | string): string {
  return COLOR_BY_ID.get(id)?.label ?? AVATAR_COLORS[0].label;
}

/** The host defaults to coral (the house color); guests get the next free one. */
export const DEFAULT_HOST_COLOR: AvatarColorId = "coral";
export const DEFAULT_GUEST_COLOR: AvatarColorId = "teal";
