"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "./color-picker";
import { ParticipantDot } from "./participant-dot";
import { EMPTY_FORM_STATE, type RoomFormState } from "@/types/room-form";
import type { AvatarColorId } from "@/constants/avatar-colors";
import type { GuestIdentity } from "@/types/room";

type Action = (
  state: RoomFormState,
  formData: FormData,
) => Promise<RoomFormState>;

/**
 * Who you are, in two fields. Shared by "start a night" and "join a room" so
 * identity is asked for exactly one way.
 */
export function IdentityForm({
  action,
  defaultIdentity,
  defaultColor,
  takenColors = [],
  submitLabel,
  hidden,
}: {
  action: Action;
  defaultIdentity?: GuestIdentity | null;
  defaultColor: AvatarColorId;
  takenColors?: AvatarColorId[];
  submitLabel: string;
  /** Extra values to post, e.g. the room code when joining. */
  hidden?: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState(action, EMPTY_FORM_STATE);

  const [name, setName] = useState(defaultIdentity?.name ?? "");
  const [color, setColor] = useState<AvatarColorId>(
    defaultIdentity && !takenColors.includes(defaultIdentity.color)
      ? defaultIdentity.color
      : defaultColor,
  );

  const trimmed = name.trim();

  return (
    <form action={formAction} className="space-y-7">
      {hidden &&
        Object.entries(hidden).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

      <div className="space-y-2.5">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada"
          maxLength={24}
          autoComplete="off"
          autoCapitalize="words"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Just so your person knows who&apos;s here. No account, no email.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Your color</Label>
        <ColorPicker value={color} onChange={setColor} taken={takenColors} />
      </div>

      {/* You, as you'll appear on the shared playhead. */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-4 py-3">
        <ParticipantDot color={color} />
        <span className="text-sm text-muted-foreground">
          You&apos;ll show up as{" "}
          <span className="font-medium text-foreground">
            {trimmed || "your name"}
          </span>
        </span>
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || !trimmed}
      >
        {isPending ? "One moment…" : submitLabel}
      </Button>
    </form>
  );
}
