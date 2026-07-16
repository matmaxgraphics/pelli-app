"use client";

import { Check } from "lucide-react";
import { AVATAR_COLORS, type AvatarColorId } from "@/constants/avatar-colors";
import { cn } from "@/lib/utils";

/**
 * Pick the color you'll be on the shared playhead.
 *
 * Native radios rather than buttons: arrow-key navigation, form submission and
 * screen-reader semantics all come for free, and the value posts with the form.
 */
export function ColorPicker({
  name = "color",
  value,
  onChange,
  taken = [],
}: {
  name?: string;
  value: AvatarColorId;
  onChange: (color: AvatarColorId) => void;
  /** Colors already worn by someone else in this room. */
  taken?: AvatarColorId[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Your color"
      className="flex flex-wrap gap-2.5"
    >
      {AVATAR_COLORS.map((color) => {
        const isTaken = taken.includes(color.id);
        const isSelected = value === color.id;

        return (
          <label
            key={color.id}
            title={isTaken ? `${color.label} — taken` : color.label}
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-full",
              "ring-offset-2 ring-offset-background transition-transform",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
              isTaken
                ? "cursor-not-allowed opacity-30"
                : "cursor-pointer hover:scale-105 active:scale-95",
            )}
          >
            <input
              type="radio"
              name={name}
              value={color.id}
              checked={isSelected}
              disabled={isTaken}
              onChange={() => onChange(color.id)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "grid h-full w-full place-items-center rounded-full transition-shadow",
                isSelected && "shadow-subtle",
              )}
              style={{ backgroundColor: color.hex }}
            >
              {isSelected && (
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              )}
            </span>
            <span className="sr-only">
              {color.label}
              {isTaken ? " (already taken)" : ""}
            </span>
          </label>
        );
      })}
    </div>
  );
}
