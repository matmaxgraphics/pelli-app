"use client";

import { useRef, useState } from "react";
import { Maximize, Play, Volume2, VolumeX } from "lucide-react";
import { usePlaybackSync } from "@/hooks/use-playback-sync";
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
        src={video.url}
        controls={isHost}
        playsInline
        preload="metadata"
        className="h-full w-full bg-black"
      />

      {/* Reactions and other transient layers float over the film. */}
      {overlay}

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
      {!isHost && !needsGesture && (
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
