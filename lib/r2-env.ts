import "server-only";

/**
 * Cloudflare R2 settings. Server-only by construction: these are credentials,
 * and `server-only` makes importing this from a client component a build error
 * rather than a leaked secret.
 *
 * Optional as a group. Without them the app still runs; hosts just paste a link
 * instead of uploading (see isR2Configured, which gates the Upload tab).
 */

const NAMES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

export function isR2Configured(): boolean {
  return NAMES.every((name) => Boolean(process.env[name]));
}

function value(name: (typeof NAMES)[number]): string {
  const found = process.env[name];
  if (!found) {
    throw new Error(
      `Missing ${name}. Film uploads need Cloudflare R2: see "Film storage" in the README.`,
    );
  }
  return found;
}

export const r2Env = {
  get accountId() {
    return value("R2_ACCOUNT_ID");
  },
  get accessKeyId() {
    return value("R2_ACCESS_KEY_ID");
  },
  get secretAccessKey() {
    return value("R2_SECRET_ACCESS_KEY");
  },
  get bucket() {
    return value("R2_BUCKET");
  },
};
