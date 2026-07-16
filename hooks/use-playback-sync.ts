"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DRIFT_THRESHOLD_SECONDS,
  HEARTBEAT_MS,
  SEEK_SETTLE_MS,
} from "@/constants/playback";
import { PLAYBACK_EVENT } from "@/types/playback";
import type { ControlEvent, HeartbeatEvent } from "@/types/playback";
import type { PlaybackSnapshot } from "@/types/room";

interface Options {
  code: string;
  isHost: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Persisted state to open on — the refresh/late-join anchor. */
  initial: PlaybackSnapshot;
}

interface SyncState {
  /** Guest only: the browser blocked autoplay and needs one tap to proceed. */
  needsGesture: boolean;
  /** Resolve the autoplay block. Safe to call from a click handler. */
  resume: () => void;
}

/**
 * Keeps two players on the same second.
 *
 * Host is the clock: its play / pause / seek broadcast instantly, and a
 * heartbeat carries its current position every HEARTBEAT_MS. Guests never
 * broadcast — they only apply, hard-seeking whenever they drift past
 * DRIFT_THRESHOLD_SECONDS. Everything reconciles on video position, never on
 * wall-clock, because the two machines don't share a clock but do share a film.
 */
export function usePlaybackSync({
  code,
  isHost,
  videoRef,
  initial,
}: Options): SyncState {
  const [needsGesture, setNeedsGesture] = useState(false);

  // A remote command just moved the video; ignore drift until it settles so we
  // don't chase our own correction.
  const suppressDriftUntil = useRef(0);
  // A play() the browser refused; replayed when the guest taps to resume.
  const pendingPlay = useRef(false);

  const attemptPlay = useCallback((video: HTMLVideoElement) => {
    const result = video.play();
    if (result) {
      result.catch(() => {
        // Autoplay policy blocked us — surface the tap gate.
        pendingPlay.current = true;
        setNeedsGesture(true);
      });
    }
  }, []);

  const resume = useCallback(() => {
    const video = videoRef.current;
    setNeedsGesture(false);
    if (video && pendingPlay.current) {
      pendingPlay.current = false;
      void video.play().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open at the persisted position once the element and its metadata exist.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const seekToStart = () => {
      if (Number.isFinite(initial.position) && initial.position > 0) {
        video.currentTime = initial.position;
      }
    };
    if (video.readyState >= 1) seekToStart();
    else video.addEventListener("loadedmetadata", seekToStart, { once: true });
    // Mount only; later positions arrive over the channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`room-playback:${code}`, {
      config: { broadcast: { self: false } },
    });

    const teardown = isHost
      ? wireHost(video, code, channel)
      : wireGuest(video, channel, { attemptPlay, suppressDriftUntil });

    channel.subscribe();

    return () => {
      teardown();
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isHost]);

  return { needsGesture, resume };
}

// --- Host: broadcast every discrete action, heartbeat while connected --------

function wireHost(
  video: HTMLVideoElement,
  code: string,
  channel: RealtimeChannel,
): () => void {
  const supabase = getSupabaseBrowserClient();

  const send = (event: string, payload: ControlEvent | HeartbeatEvent) =>
    void channel.send({ type: "broadcast", event, payload });

  const persist = (isPlaying: boolean) => {
    void supabase
      .from("rooms")
      .update({
        playback_position: video.currentTime,
        is_playing: isPlaying,
        playback_updated_at: new Date().toISOString(),
      })
      .eq("code", code);
  };

  const control = (action: ControlEvent["action"], isPlaying: boolean) => {
    send(PLAYBACK_EVENT.control, { action, position: video.currentTime });
    persist(isPlaying);
  };

  const onPlay = () => control("play", true);
  const onPause = () => control("pause", false);

  // Debounce seeks: dragging the scrubber fires a burst; only the final
  // position needs to go out.
  let seekTimer: ReturnType<typeof setTimeout> | undefined;
  const onSeeked = () => {
    clearTimeout(seekTimer);
    seekTimer = setTimeout(() => control("seek", !video.paused), 120);
  };

  const heartbeat = setInterval(() => {
    send(PLAYBACK_EVENT.heartbeat, {
      position: video.currentTime,
      isPlaying: !video.paused,
    });
  }, HEARTBEAT_MS);

  video.addEventListener("play", onPlay);
  video.addEventListener("pause", onPause);
  video.addEventListener("seeked", onSeeked);

  return () => {
    clearInterval(heartbeat);
    clearTimeout(seekTimer);
    video.removeEventListener("play", onPlay);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("seeked", onSeeked);
  };
}

// --- Guest: apply control events, drift-correct on heartbeat -----------------

function wireGuest(
  video: HTMLVideoElement,
  channel: RealtimeChannel,
  helpers: {
    attemptPlay: (video: HTMLVideoElement) => void;
    suppressDriftUntil: React.MutableRefObject<number>;
  },
): () => void {
  const { attemptPlay, suppressDriftUntil } = helpers;

  const seekTo = (position: number) => {
    if (Math.abs(video.currentTime - position) > 0.05) {
      video.currentTime = position;
    }
    suppressDriftUntil.current = Date.now() + SEEK_SETTLE_MS;
  };

  channel.on("broadcast", { event: PLAYBACK_EVENT.control }, ({ payload }) => {
    const event = payload as ControlEvent;
    seekTo(event.position);
    if (event.action === "play") attemptPlay(video);
    else if (event.action === "pause") video.pause();
  });

  channel.on("broadcast", { event: PLAYBACK_EVENT.heartbeat }, ({ payload }) => {
    const event = payload as HeartbeatEvent;

    // Match play/pause intent.
    if (event.isPlaying && video.paused) attemptPlay(video);
    if (!event.isPlaying && !video.paused) video.pause();

    // Drift-correct, unless we just seeked and the browser is still landing.
    if (Date.now() < suppressDriftUntil.current) return;
    if (
      event.isPlaying &&
      Math.abs(video.currentTime - event.position) > DRIFT_THRESHOLD_SECONDS
    ) {
      seekTo(event.position);
    }
  });

  // Broadcast subscriptions are torn down with the channel; nothing else to do.
  return () => undefined;
}
