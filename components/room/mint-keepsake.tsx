"use client";

import { Check, ExternalLink, Gem, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeepsake } from "@/hooks/use-keepsake";
import {
  KEEPSAKE_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
  isKeepsakeConfigured,
} from "@/lib/chain/monad";
import type { MintInput } from "@/lib/chain/keepsake";

/**
 * The one place Pelli meets the chain: mint the night as a keepsake on Monad.
 * Optional and end-of-night — the app never blocks on a wallet. If the contract
 * isn't deployed yet, this shows a calm "coming online" note instead of failing.
 */
export function MintKeepsake({ input }: { input: MintInput }) {
  const { status, result, error, mint, reset } = useKeepsake();

  if (!isKeepsakeConfigured()) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
        <Gem className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          Keepsake minting comes online soon
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Once the keepsake contract is live on Monad testnet, you&apos;ll be able
          to keep tonight forever.
        </p>
      </div>
    );
  }

  if (status === "success" && result) {
    return (
      <div className="rounded-2xl border border-border bg-accent/60 p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <p className="mt-3 text-base font-semibold text-foreground">
          Kept forever
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.tokenId
            ? `Keepsake #${result.tokenId} is now on Monad — a permanent record of tonight.`
            : "Tonight is now on Monad — a permanent record of the night."}
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <a
            href={explorerTxUrl(result.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View transaction <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {KEEPSAKE_ADDRESS && (
            <a
              href={explorerAddressUrl(KEEPSAKE_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              View contract <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-subtle">
      <Gem className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-2 text-base font-semibold text-foreground">
        Keep tonight forever
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Mint this movie night as a keepsake on Monad testnet — the film, who was
        here, and how it felt, kept on-chain for both of you.
      </p>

      <div className="mt-4">
        <Button
          onClick={() => mint(input)}
          disabled={status === "minting"}
          size="lg"
        >
          {status === "minting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirm in your wallet…
            </>
          ) : (
            <>
              <Gem className="h-4 w-4" />
              Mint tonight&apos;s keepsake
            </>
          )}
        </Button>
      </div>

      {status === "error" && error && (
        <div className="mt-3 text-sm text-destructive">
          <p>{error}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
