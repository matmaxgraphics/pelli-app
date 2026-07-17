import { defineChain } from "viem";

/**
 * Monad testnet — the one chain Pelli touches, and only from the Summary.
 * Params confirmed against chainlist/Monad docs (chain id 10143).
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
});

/**
 * The deployed MovieNightKeepsake address. Optional: until it's set the Summary
 * shows the keepsake as "coming online" instead of crashing, so the rest of the
 * app is never blocked on the contract existing.
 */
export const KEEPSAKE_ADDRESS = process.env
  .NEXT_PUBLIC_KEEPSAKE_ADDRESS as `0x${string}` | undefined;

export function isKeepsakeConfigured(): boolean {
  return typeof KEEPSAKE_ADDRESS === "string" && /^0x[0-9a-fA-F]{40}$/.test(KEEPSAKE_ADDRESS);
}

export function explorerTxUrl(hash: string): string {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${monadTestnet.blockExplorers.default.url}/address/${address}`;
}

/** Just what the app calls: mint, and the event it emits. */
export const KEEPSAKE_ABI = [
  {
    type: "function",
    name: "mintMovieNight",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "title", type: "string" },
      { name: "participants", type: "string[]" },
      { name: "watchedAt", type: "uint64" },
      { name: "topReaction", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "MovieNightMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "mintedBy", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "watchedAt", type: "uint64", indexed: false },
    ],
  },
] as const;
