import "server-only";

import { headers } from "next/headers";

/**
 * The origin this request arrived on, for building invite links.
 *
 * Read from headers rather than window.location so the link and QR are correct
 * in the very first paint, and rather than an env var so localhost, a preview
 * deployment and production each produce a link that actually works.
 */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();

  // Vercel and most proxies set the x-forwarded-* pair; host is the fallback.
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}
