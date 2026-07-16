"use client";

import { REACTIONS } from "@/constants/reactions";
import { cn } from "@/lib/utils";

/**
 * The row of feelings. Tapping one floats it over the film for everyone. Kept
 * small and quiet so it never competes with the movie.
 */
export function ReactionBar({
  onReact,
  className,
}: {
  onReact: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-full border border-border bg-card/90 p-1.5 shadow-subtle backdrop-blur-sm",
        className,
      )}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full text-xl",
            "transition-transform hover:scale-110 hover:bg-muted active:scale-95",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
