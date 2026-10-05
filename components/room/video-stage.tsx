"use client";

import { useRef, useState } from "react";
import { AlertCircle, Loader2, Maximize, Play, Volume2, VolumeX } from "lucide-react";
import { usePlaybackSync } from "@/hooks/use-playback-sync";
import { useVideoSrc } from "@/hooks/use-video-src";
import type { PlaybackSnapshot, RoomVideo } from "@/types/room";
import { cn } from "@/lib/utils";

/**
 * The shared screen.
 *
 * The host gets native controls — it's the one driving. The guest's element has
 * no scrubber (their playback is driven for them) but keeps mute and fullscreen,
 * and shows a one-tap gate when the browser blocks autoplay.
 */
export function VideoStage({
  code,
  isHost,
  video,
  initialPlayback,
  overlay,
}: {
  code: string;
  isHost: boolean;
  video: RoomVideo;
  initialPlayback: PlaybackSnapshot;
  /** Rendered over the film — e.g. floating reactions. Must not catch clicks. */
  overlay?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);

  // The <video> is always rendered, even before its URL is known: the sync hook
  // binds to the element once, on mount, so it has to exist from the start.
  const { src, status, onError, retry } = useVideoSrc(code, video, videoRef);

  const { needsGesture, resume } = usePlaybackSync({
    code,
    isHost,
    videoRef,
    initial: initialPlayback,
  });

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  function goFullscreen() {
    void containerRef.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-lift"
    >
      <video
        ref={videoRef}
        src={src ?? undefined}
        controls={isHost}
        playsInline
        preload="metadata"
        onError={onError}
        className="h-full w-full bg-black"
      />

      {/* Reactions and other transient layers float over the film. */}
      {overlay}

      {status === "loading" && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white"
        >
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
          <span className="text-sm">Preparing the film…</span>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white"
        >
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">
            {video.kind === "link"
              ? "That link couldn't be played. It may need to be a direct MP4 or WebM link."
              : "The film couldn't be opened."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
        </div>
      )}

      {/* Guest autoplay gate — one tap satisfies the browser's gesture rule. */}
      {needsGesture && !isHost && (
        <button
          type="button"
          onClick={resume}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white backdrop-blur-sm"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary shadow-lift">
            <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
          </span>
          <span className="text-sm font-medium">Tap to watch together</span>
        </button>
      )}

      {/* Guest mini-controls: no scrubbing, just mute and fullscreen. */}
      {!isHost && !needsGesture && status === "ready" && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <GuestButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </GuestButton>
          <GuestButton onClick={goFullscreen} label="Fullscreen">
            <Maximize className="h-4 w-4" />
          </GuestButton>
        </div>
      )}
    </div>
  );
}

function GuestButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg text-white",
        "bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/65",
      )}
    >
      {children}
    </button>
  );
}
