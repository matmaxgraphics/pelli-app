"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVideoUrlAction } from "@/server/playback-actions";
import type { RoomVideo } from "@/types/room";

export type VideoSrcStatus = "loading" | "ready" | "error";

/** Don't refetch a URL more often than this when the video keeps failing. */
const MIN_REFRESH_GAP_MS = 5000;

/**
 * The URL the <video> should play.
 *
 * A pasted link is already playable. An upload has no permanent URL — it is
 * private, so each viewer asks the server for a signed one, which also proves
 * they're seated in the room. If that URL ever lapses (a long pause, a sleeping
 * laptop) the player errors; we mint a fresh one and put the film back exactly
 * where it was, rather than leaving the viewer on a dead screen.
 */
export function useVideoSrc(
  code: string,
  video: RoomVideo,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const isUpload = video.kind === "upload";

  const [src, setSrc] = useState<string | null>(isUpload ? null : video.url);
  const [status, setStatus] = useState<VideoSrcStatus>(isUpload ? "loading" : "ready");

  /** Where to put the film back after the src changes under it. */
  const resume = useRef<{ time: number; playing: boolean } | null>(null);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    lastFetch.current = Date.now();
    const result = await getVideoUrlAction(code);
    if (result.error !== null) {
      setStatus("error");
      return;
    }
    setSrc(result.url);
    setStatus("ready");
  }, [code]);

  // First fetch, for uploads. Inline (not `load`) so a response that arrives
  // after the player has gone away is dropped instead of updating dead state.
  useEffect(() => {
    if (!isUpload) return;
    let cancelled = false;

    void (async () => {
      lastFetch.current = Date.now();
      const result = await getVideoUrlAction(code);
      if (cancelled) return;
      if (result.error !== null) {
        setStatus("error");
        return;
      }
      setSrc(result.url);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [isUpload, video.path, code]);

  // After a refresh, restore the position once the new source can seek.
  useEffect(() => {
    const element = videoRef.current;
    const place = resume.current;
    if (!element || !src || !place) return;
    resume.current = null;

    const restore = () => {
      element.currentTime = place.time;
      if (place.playing) void element.play().catch(() => undefined);
    };
    if (element.readyState >= 1) restore();
    else element.addEventListener("loadedmetadata", restore, { once: true });
  }, [src, videoRef]);

  /** The <video> reported an error. */
  const onError = useCallback(() => {
    if (!isUpload) {
      setStatus("error");
      return;
    }
    // Already tried a fresh URL moments ago and it failed too: stop looping.
    if (Date.now() - lastFetch.current < MIN_REFRESH_GAP_MS) {
      setStatus("error");
      return;
    }
    const element = videoRef.current;
    if (element) {
      resume.current = { time: element.currentTime, playing: !element.paused };
    }
    void load();
  }, [isUpload, load, videoRef]);

  /** The viewer pressed "Try again". */
  const retry = useCallback(() => {
    setStatus("loading");
    if (isUpload) {
      void load();
    } else {
      // A link: reload the same source.
      const element = videoRef.current;
      if (element) {
        element.load();
      }
      setStatus("ready");
    }
  }, [isUpload, load, videoRef]);

  return { src, status, onError, retry };
}
