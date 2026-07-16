"use client";

import { useRef, useState } from "react";
import { AlertCircle, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setVideoAction } from "@/server/playback-actions";
import { uploadMovie, validateVideoFile } from "@/lib/supabase/storage";
import { ACCEPTED_VIDEO_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/constants/playback";
import { cn } from "@/lib/utils";

type Mode = "upload" | "link";

/**
 * How the host chooses tonight's film. Two ways in: upload a file, or paste a
 * direct link. On success the room row flips to "watching" and everyone's view
 * becomes the player over the same Realtime channel — nothing to do here but
 * report failure.
 */
export function VideoSourceForm({ code }: { code: string }) {
  const [mode, setMode] = useState<Mode>("upload");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

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
    setBusy(true);
    setStatus("Uploading…");
    try {
      const uploaded = await uploadMovie(file, code);
      setStatus("Starting the room…");
      const result = await setVideoAction({
        code,
        url: uploaded.url,
        name: uploaded.name,
        path: uploaded.path,
      });
      if (result.error) {
        setError(result.error);
        setBusy(false);
        setStatus(null);
      }
      // Success: the room UPDATE broadcast swaps this view for the player.
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong uploading that file.",
      );
      setBusy(false);
      setStatus(null);
    }
  }

  async function handleLink() {
    if (!url.trim()) {
      setError("Paste a link to an MP4 or WebM video.");
      return;
    }
    setError(null);
    setBusy(true);
    setStatus("Starting the room…");
    const result = await setVideoAction({
      code,
      url: url.trim(),
      name: title.trim() || fileNameFromUrl(url),
      path: null,
    });
    if (result.error) {
      setError(result.error);
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle sm:p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Choose tonight&apos;s film
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a clip or paste a link. Your person watches it in step with you.
      </p>

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

      <div className="mt-5">
        {mode === "upload" ? (
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
              MP4 or WebM, up to {maxMb}MB. A short clip is perfect for a first watch.
            </p>
            <Button onClick={handleUpload} disabled={busy} className="w-full">
              {busy ? status ?? "Working…" : "Start watching"}
            </Button>
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
              placeholder="https://example.com/clip.mp4"
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
              {busy ? status ?? "Working…" : "Start watching"}
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
