"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Check, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRoomCode } from "@/utils/room-code";
import { cn } from "@/lib/utils";

/**
 * The whole invite: a code to read aloud, a link to paste, a QR to point a
 * phone at. Three routes to the same room because the demo shouldn't hinge on
 * which one happens to be convenient.
 */
export function InvitePanel({
  code,
  inviteUrl,
  /** Once both people are in, this stops being an invite and becomes a receipt. */
  connected = false,
}: {
  code: string;
  /** Built server-side (see lib/origin.ts) so the QR is right on first paint. */
  inviteUrl: string;
  connected?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle sm:p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {connected ? "Room code" : "Invite your person"}
      </h2>

      <div className="mt-4">
        {/* Once connected the heading above already says "Room code" — don't
            say it twice. */}
        {!connected && <p className="text-xs text-muted-foreground">Room code</p>}
        <p
          className={cn(
            "font-mono text-3xl font-semibold tracking-[0.18em] text-foreground sm:text-4xl",
            !connected && "mt-1",
          )}
        >
          {formatRoomCode(code)}
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        <CopyField value={inviteUrl} />

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setShowQr((open) => !open)}
          aria-expanded={showQr}
          aria-controls="invite-qr"
        >
          <QrCode className="h-4 w-4" />
          {showQr ? "Hide QR code" : "Show QR code"}
        </Button>
      </div>

      {showQr && (
        <div
          id="invite-qr"
          className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-5"
        >
          {/* SVG, so it stays crisp scaled up on a projector. */}
          <QRCode
            value={inviteUrl}
            size={168}
            bgColor="#FBFAF9"
            fgColor="#1C1917"
            level="M"
            aria-hidden
          />
          <p className="text-center text-xs text-muted-foreground">
            Point a phone camera at this to join.
          </p>
        </div>
      )}
    </div>
  );
}

/** Copy-to-clipboard with confirmation, because "did that work?" kills a demo. */
function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission).
      // Selecting the text lets the person copy it by hand instead.
      const field = document.getElementById(
        "invite-url",
      ) as HTMLInputElement | null;
      field?.select();
    }
  }

  return (
    <div className="flex gap-2">
      <input
        id="invite-url"
        readOnly
        value={value}
        aria-label="Invite link"
        onFocus={(event) => event.currentTarget.select()}
        className={cn(
          "h-11 min-w-0 flex-1 rounded-lg border border-border bg-muted/50 px-3.5",
          "font-mono text-xs text-muted-foreground outline-none",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        )}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={copy}
        disabled={!value}
        className="shrink-0"
        aria-label={copied ? "Link copied" : "Copy invite link"}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
