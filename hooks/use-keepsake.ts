"use client";

import { useCallback, useState } from "react";
import {
  mintKeepsake,
  WalletError,
  type MintInput,
  type MintResult,
} from "@/lib/chain/keepsake";

type MintStatus = "idle" | "minting" | "success" | "error";

interface KeepsakeState {
  status: MintStatus;
  result: MintResult | null;
  error: string | null;
  mint: (input: MintInput) => Promise<void>;
  reset: () => void;
}

/** Drives the mint button: connect → switch network → sign → confirm. */
export function useKeepsake(): KeepsakeState {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async (input: MintInput) => {
    setStatus("minting");
    setError(null);
    try {
      const minted = await mintKeepsake(input);
      setResult(minted);
      setStatus("success");
    } catch (err) {
      setError(
        err instanceof WalletError
          ? err.message
          : "Something went wrong minting the keepsake.",
      );
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, mint, reset };
}
