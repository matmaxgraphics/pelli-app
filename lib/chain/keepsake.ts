import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEventLogs,
  type Address,
} from "viem";
import {
  KEEPSAKE_ABI,
  KEEPSAKE_ADDRESS,
  monadTestnet,
} from "./monad";

/**
 * Minting the keepsake, via viem over the injected wallet (MetaMask). No wagmi:
 * this is one isolated button, and a plain wallet client keeps the whole flow
 * in ~one file with nothing app-wide to misconfigure. The core app never
 * imports this.
 */

interface Eip1193Provider {
  request(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export type WalletErrorKind =
  | "no_wallet"
  | "not_configured"
  | "rejected"
  | "wrong_network"
  | "failed";

export class WalletError extends Error {
  constructor(
    message: string,
    readonly kind: WalletErrorKind,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

export interface MintInput {
  title: string;
  participants: string[];
  watchedAt: number; // unix seconds
  topReaction: string;
}

export interface MintResult {
  txHash: `0x${string}`;
  tokenId: string | null;
  account: Address;
}

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

function hasCode(err: unknown, code: number): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === code
  );
}

/** Move the wallet to Monad testnet, adding it if the wallet doesn't know it. */
async function ensureMonad(provider: Eip1193Provider): Promise<void> {
  const chainIdHex = `0x${monadTestnet.id.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    // 4902 = chain unknown to the wallet; add it, then it's selected.
    if (hasCode(err, 4902)) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: monadTestnet.name,
            nativeCurrency: monadTestnet.nativeCurrency,
            rpcUrls: monadTestnet.rpcUrls.default.http,
            blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
          },
        ],
      });
    } else if (hasCode(err, 4001)) {
      throw new WalletError("You declined the network switch.", "rejected");
    } else {
      throw new WalletError(
        "Couldn't switch to Monad testnet. Add it in your wallet and try again.",
        "wrong_network",
      );
    }
  }
}

/** Prompt the wallet for an account. */
export async function connectWallet(): Promise<Address> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError(
      "No wallet found. Install MetaMask to mint the keepsake.",
      "no_wallet",
    );
  }
  try {
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts?.length) {
      throw new WalletError("No account was connected.", "rejected");
    }
    return accounts[0] as Address;
  } catch (err) {
    if (err instanceof WalletError) throw err;
    if (hasCode(err, 4001)) {
      throw new WalletError("You declined the connection.", "rejected");
    }
    throw new WalletError("Couldn't connect to your wallet.", "failed");
  }
}

/** Connect, ensure network, mint, and wait for the receipt. */
export async function mintKeepsake(input: MintInput): Promise<MintResult> {
  if (!KEEPSAKE_ADDRESS) {
    throw new WalletError(
      "The keepsake contract isn't set up yet.",
      "not_configured",
    );
  }
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError(
      "No wallet found. Install MetaMask to mint the keepsake.",
      "no_wallet",
    );
  }

  const account = await connectWallet();
  await ensureMonad(provider);

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.writeContract({
      address: KEEPSAKE_ADDRESS,
      abi: KEEPSAKE_ABI,
      functionName: "mintMovieNight",
      args: [
        account,
        input.title,
        input.participants,
        BigInt(Math.floor(input.watchedAt)),
        input.topReaction,
      ],
    });
  } catch (err) {
    if (hasCode(err, 4001)) {
      throw new WalletError("You declined the transaction.", "rejected");
    }
    throw new WalletError(
      "The mint didn't go through. Check you have testnet MON for gas.",
      "failed",
    );
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let tokenId: string | null = null;
  try {
    const logs = parseEventLogs({
      abi: KEEPSAKE_ABI,
      logs: receipt.logs,
      eventName: "MovieNightMinted",
    });
    if (logs.length > 0) {
      tokenId = (logs[0].args.tokenId as bigint).toString();
    }
  } catch {
    // A missing tokenId doesn't invalidate the mint; the tx is what matters.
  }

  return { txHash, tokenId, account };
}
