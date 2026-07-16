"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { checkRoomCodeAction } from "@/server/room-actions";
import { EMPTY_FORM_STATE } from "@/types/room-form";
import {
  ROOM_CODE_LENGTH,
  formatRoomCode,
  normalizeRoomCode,
} from "@/utils/room-code";
import { cn } from "@/lib/utils";

/**
 * Step one of joining: the code.
 *
 * Typed with the dash shown but posted normalized, so "k7m-p2q", "K7MP2Q" and
 * a code pasted with a stray space all work. Checking the code before asking
 * for a name means a typo costs one step, not two.
 */
export function CodeForm() {
  const [state, formAction, isPending] = useActionState(
    checkRoomCodeAction,
    EMPTY_FORM_STATE,
  );
  const [code, setCode] = useState("");

  const normalized = normalizeRoomCode(code);
  const complete = normalized.length === ROOM_CODE_LENGTH;

  return (
    <form action={formAction} className="space-y-7">
      {/* The visible field is formatted for reading; this is what posts. */}
      <input type="hidden" name="code" value={normalized} />

      <div className="space-y-2.5">
        <Label htmlFor="code-input">Room code</Label>
        <input
          id="code-input"
          value={formatRoomCode(normalized) || code}
          onChange={(event) =>
            setCode(normalizeRoomCode(event.target.value).slice(0, ROOM_CODE_LENGTH))
          }
          placeholder="K7M-P2Q"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "code-error" : undefined}
          className={cn(
            "h-16 w-full rounded-xl border border-border bg-card px-4 text-center",
            "font-mono text-2xl font-semibold uppercase tracking-[0.3em] text-foreground",
            "placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-muted-foreground/50",
            "outline-none transition-colors",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
            state.error && "border-destructive focus-visible:ring-destructive/25",
          )}
        />
        <p className="text-xs text-muted-foreground">
          Six characters, from whoever started the night.
        </p>
      </div>

      {state.error && (
        <p
          id="code-error"
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
        disabled={isPending || !complete}
      >
        {isPending ? "Looking for the room…" : "Continue"}
      </Button>
    </form>
  );
}
