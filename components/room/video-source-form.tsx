"use client";

import { useRef, useState } from "react";
import { AlertCircle, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUploadAction } from "@/server/upload-actions";
import { setVideoAction } from "@/server/playback-actions";
import { putFile, UploadAborted } from "@/lib/upload-file";
import { ACCEPTED_VIDEO_EXTENSIONS } from "@/constants/playback";
import {
  MAX_UPLOAD_MB,
  titleFromFileName,
  validateVideoFile,
} from "@/utils/video-file";
import { cn } from "@/lib/utils";

type Mode = "upload" | "link";
type Phase = "idle" | "preparing" | "uploading" | "finishing" | "starting";

/**
 * How the host chooses tonight's film. Two ways in: upload a file, or paste a
 * direct link. On success the room row flips to "watching" and everyone's view
 * becomes the player over the same Realtime channel — nothing to do here but
 * show progress and report failure.
 *
 * `uploadEnabled` is false until film storage is configured; then only the link
 * path exists, rather than an Upload tab that can't work.
 */
export function VideoSourceForm({
  code,
  uploadEnabled,
}: {
  code: string;
  uploadEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>(uploadEnabled ? "upload" : "link");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const busy = phase !== "idle";
  const percent = Math.round(progress * 100);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a video file first.");
      return;
    }
    const invalid = validateVideoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setProgress(0);
    setPhase("preparing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 1. Ask the server for permission — it only says yes to the host.
      const permit = await createUploadAction({
        code,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (permit.error !== null) {
        setError(permit.error);
        setPhase("idle");
        return;
      }

      // 2. Send the film straight to storage.
      setPhase("uploading");
      await putFile({
        url: permit.uploadUrl,
        file,
        contentType: permit.contentType,
        onProgress: setProgress,
        signal: controller.signal,
      });

      // 3. Tell the room it landed; the server checks it before accepting it.
      setPhase("finishing");
      const result = await setVideoAction({
        kind: "upload",
        code,
        name: titleFromFileName(file.name),
        key: permit.key,
      });
      if (result.error) {
        setError(result.error);
        setPhase("idle");
      }
      // Success: the room UPDATE swaps this view for the player.
    } catch (caught) {
      if (caught instanceof UploadAborted) {
        setPhase("idle");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong uploading that file.",
      );
      setPhase("idle");
    } finally {
      abortRef.current = null;
    }
  }

  async function handleLink() {
    if (!url.trim()) {
      setError("Paste a link to an MP4 or WebM video.");
      return;
    }
    setError(null);
    setPhase("starting");
    const result = await setVideoAction({
      kind: "link",
      code,
      name: title.trim() || fileNameFromUrl(url),
      url: url.trim(),
    });
    if (result.error) {
      setError(result.error);
      setPhase("idle");
    }
  }

  const phaseLabel =
    phase === "preparing"
      ? "Getting ready…"
      : phase === "uploading"
        ? `Uploading… ${percent}%`
        : "Starting the room…";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle sm:p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Choose tonight&apos;s film
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {uploadEnabled
          ? "Upload a film or paste a link. Everyone watches it in step with you."
          : "Paste a link to a film. Everyone watches it in step with you."}
      </p>

      {uploadEnabled && (
        <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/50 p-1">
          <ModeTab active={mode === "upload"} onClick={() => setMode("upload")} disabled={busy}>
            <Upload className="h-4 w-4" />
            Upload
          </ModeTab>
          <ModeTab active={mode === "link"} onClick={() => setMode("link")} disabled={busy}>
            <Link2 className="h-4 w-4" />
            Paste a link
          </ModeTab>
        </div>
      )}

      <div className="mt-5">
        {mode === "upload" && uploadEnabled ? (
          <div className="space-y-3">
            <Label htmlFor="film-file">Video file</Label>
            <input
              id="film-file"
              ref={fileRef}
              type="file"
              accept={ACCEPTED_VIDEO_EXTENSIONS}
              disabled={busy}
              onChange={() => setError(null)}
              className={cn(
                "block w-full text-sm text-muted-foreground",
                "file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2.5",
                "file:text-sm file:font-medium file:text-primary-foreground",
                "file:cursor-pointer hover:file:bg-primary-hover",
                "disabled:opacity-50",
              )}
            />
            <p className="text-xs text-muted-foreground">
              MP4 or WebM, up to {MAX_UPLOAD_MB} MB. H.264 MP4 plays everywhere. It&apos;s
              removed when the night ends.
            </p>

            {busy ? (
              <div className="space-y-2" aria-live="polite">
                <div
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={phase === "uploading" ? percent : undefined}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${phase === "uploading" ? percent : 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{phaseLabel}</span>
                  {phase === "uploading" && (
                    <button
                      type="button"
                      onClick={() => abortRef.current?.abort()}
                      className="font-medium underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Button onClick={handleUpload} className="w-full">
                Start watching
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="film-url">Video link</Label>
            <Input
              id="film-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError(null);
              }}
              placeholder="https://example.com/film.mp4"
              inputMode="url"
              disabled={busy}
            />
            <Label htmlFor="film-title" className="pt-1">
              Title <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="film-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Our movie"
              maxLength={80}
              disabled={busy}
            />
            <Button onClick={handleLink} disabled={busy} className="w-full">
              {busy ? "Starting the room…" : "Start watching"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-subtle"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {children}
    </button>
  );
}

/** Best-effort display name from a URL when the host didn't give a title. */
function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() ?? "";
    const name = decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, "");
    return name || "Tonight's film";
  } catch {
    return "Tonight's film";
  }
}
