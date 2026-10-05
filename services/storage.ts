import "server-only";

import { AwsClient } from "aws4fetch";
import { r2Env } from "@/lib/r2-env";
import {
  READ_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/constants/playback";
import { buildObjectKey, isObjectKey } from "@/utils/object-key";
import type { VideoExtension } from "@/utils/object-key";

/**
 * Where films live: a private Cloudflare R2 bucket, spoken to over its S3 API.
 *
 * Nothing here is public. The browser never holds a credential and never sees
 * a permanent URL — it gets a presigned URL that does exactly one thing for a
 * limited time (upload this object, or read this object).
 *
 * The only module that knows R2 exists, so the storage provider stays swappable.
 */

let client: AwsClient | undefined;

function getClient(): AwsClient {
  client ??= new AwsClient({
    accessKeyId: r2Env.accessKeyId,
    secretAccessKey: r2Env.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  return client;
}

/** The object's address on R2's S3 endpoint. Refuses anything that isn't a key. */
function objectUrl(key: string): URL {
  if (!isObjectKey(key)) {
    throw new Error("That is not a valid film key.");
  }
  return new URL(
    `https://${r2Env.accountId}.r2.cloudflarestorage.com/${r2Env.bucket}/${key}`,
  );
}

async function presign(
  method: "PUT" | "GET",
  key: string,
  ttlSeconds: number,
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));
  const signed = await getClient().sign(url.toString(), {
    method,
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Reserve a key for a room's next film. Nothing exists in R2 until it's uploaded. */
export function newFilmKey(roomCode: string, extension: VideoExtension): string {
  return buildObjectKey(roomCode, extension);
}

/** A URL the host's browser can PUT the file to, once, before it expires. */
export function presignUpload(key: string): Promise<string> {
  return presign("PUT", key, UPLOAD_URL_TTL_SECONDS);
}

/** A URL a viewer's <video> can stream from until it expires. Supports Range. */
export function presignRead(key: string): Promise<string> {
  return presign("GET", key, READ_URL_TTL_SECONDS);
}

/**
 * What actually landed in R2. The presigned URL can't promise a size, so after
 * an upload the server checks the real object rather than trusting the client.
 * Null means "not there".
 */
export async function headFilm(key: string): Promise<{ size: number } | null> {
  const response = await getClient().fetch(objectUrl(key), { method: "HEAD" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Could not check the upload (storage said ${response.status}).`);
  }
  return { size: Number(response.headers.get("content-length") ?? 0) };
}

/** Remove a film. Idempotent: deleting something already gone is fine. */
export async function deleteFilm(key: string): Promise<void> {
  const response = await getClient().fetch(objectUrl(key), { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    // R2 explains itself in an XML body (<Code>AccessDenied</Code> ...). Surface
    // the code, never the body wholesale: it can echo request details.
    const code = (await response.text().catch(() => "")).match(/<Code>([^<]+)<\/Code>/)?.[1];
    throw new Error(
      `Could not delete the film (storage said ${response.status}${code ? ` ${code}` : ""}).`,
    );
  }
}
