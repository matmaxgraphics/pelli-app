import { avatarHex } from "@/constants/avatar-colors";
import { cn } from "@/lib/utils";
import type { AvatarColorId } from "@/constants/avatar-colors";

const sizes = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
} as const;

/**
 * A person, rendered the way Pelli always renders a person: a colored dot and
 * a name. Same idiom as the presence-sync on the landing hero, so identity
 * reads identically from the first screen to the room.
 */
export function ParticipantDot({
  color,
  size = "md",
  pulse = false,
  className,
}: {
  color: AvatarColorId;
  size?: keyof typeof sizes;
  /** Waiting for someone: a slow breath so the room feels alive, not stalled. */
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-full",
        sizes[size],
        pulse && "motion-safe:animate-pulse",
        className,
      )}
      style={{ backgroundColor: avatarHex(color) }}
    />
  );
}

export function ParticipantChip({
  name,
  color,
  trailing,
  className,
}: {
  name: string;
  color: AvatarColorId;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <ParticipantDot color={color} />
      <span className="truncate text-sm font-medium text-foreground">
        {name}
      </span>
      {trailing}
    </div>
  );
}
