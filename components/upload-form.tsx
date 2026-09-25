"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  ACCEPTED_TYPES,
} from "@/lib/covers/limits";
import { stageLabels } from "@/lib/covers/types";
import { cn } from "@/lib/utils";

export async function responseData(response: Response) {
  const data = await response
    .json()
    .catch(() => ({
      error:
        response.status === 413
          ? "Choose an image smaller than 4 MB."
          : "The request was interrupted. Check your library before retrying.",
    }));
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data;
}

export function UploadForm({ full, resolutions }: { full: boolean; resolutions: { id: string; name: string; width: number; height: number }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const uploadId = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stage, setStage] = useState("Uploading your cover…");
  const [resolutionId, setResolutionId] = useState(resolutions[0]?.id || "");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!busy || !activeId) return;
    const timer = setInterval(async () => {
      try {
        const data = await responseData(
          await fetch(`/api/uploads/${activeId}`, { cache: "no-store" }),
        );
        if (data.stage)
          setStage(stageLabels[data.stage] || "Processing your cover…");
      } catch {
        /* The processing request remains authoritative. */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [busy, activeId]);

  async function choose(next?: File) {
    if (!next || lock.current) return;
    setError(null);
    setActiveId(null);
    uploadId.current = null;
    setFile(null);
    setPreview(null);
    if (next.size > MAX_UPLOAD_BYTES) {
      setError("This image is too large. Choose a file smaller than 4 MB.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(next);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > MAX_IMAGE_PIXELS) {
        setError("Choose an image of at most 20 megapixels.");
        return;
      }
    } catch {
      setError("This image could not be opened. Please choose another file.");
      return;
    }
    uploadId.current = crypto.randomUUID();
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function submit() {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setStage("Uploading your cover…");
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("id", uploadId.current!);
      form.set("resolutionId", resolutionId);
      const upload = await responseData(
        await fetch("/api/uploads", { method: "POST", body: form }),
      );
      setActiveId(upload.id);
      setStage("Preparing your cover…");
      router.refresh();
      await responseData(
        await fetch(`/api/uploads/${upload.id}/process`, { method: "POST" }),
      );
      router.push(`/uploads/${upload.id}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The upload failed. Please try again.",
      );
      router.refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={input}
        id="cover-upload"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || full}
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
        aria-label="Choose a book cover"
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy && !full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy && !full) {
            if (event.dataTransfer.files.length !== 1)
              setError("Drop one image at a time.");
            else void choose(event.dataTransfer.files[0]);
          }
        }}
        className={cn(
          "relative flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/25 bg-background p-7 text-center transition-colors",
          dragging && "border-primary bg-accent",
        )}
      >
        {preview ? (
          <>
            {/* Authenticated images and temporary object URLs bypass the Next.js image proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Selected book cover"
              className="mb-4 h-36 max-w-full rounded object-contain shadow-md"
            />
            <p className="max-w-full truncate text-sm font-medium">
              {file?.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {((file?.size || 0) / 1_000_000).toFixed(2)} MB · Original
              retained
            </p>
            {!busy && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                aria-label="Remove selected image"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setActiveId(null);
                  uploadId.current = null;
                }}
              >
                <X size={16} />
              </Button>
            )}
          </>
        ) : (
          <>
            <span className="mb-4 rounded-full bg-accent p-4 text-primary">
              <ImagePlus size={26} strokeWidth={1.5} />
            </span>
            <p className="font-medium">Drop your book cover here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              or choose an image from your device
            </p>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 bg-card"
          disabled={busy || full}
          onClick={() => input.current?.click()}
        >
          {file ? "Choose another image" : "Choose image"}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          JPEG, PNG, WebP · up to 4 MB · 20 megapixels
        </p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          AI enhances the cover. If the result lacks detail, try a larger,
          higher-resolution image.
        </p>
      </div>
      <label className="block space-y-2 text-sm font-medium">Output resolution
        <select className="h-11 w-full rounded-md border bg-card px-3" value={resolutionId} onChange={(event) => setResolutionId(event.target.value)} disabled={busy}>
          {resolutions.map((resolution) => <option key={resolution.id} value={resolution.id}>{resolution.name} ({resolution.width} × {resolution.height})</option>)}
        </select>
        <Link href="/settings/resolutions" className="text-xs font-normal underline underline-offset-4">Manage resolutions</Link>
      </label>
      {full && (
        <p role="alert" className="text-sm text-destructive">
          Your library is full. Delete a cover to make room.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <Button
        className="h-12 w-full"
        disabled={!file || busy || full}
        onClick={submit}
      >
        {busy ? (
          <>
            <LoaderCircle className="animate-spin" size={18} /> Processing cover
          </>
        ) : (
          <>
            Process cover <ArrowUpRight size={18} />
          </>
        )}
      </Button>
      {busy && (
        <div role="status" className="space-y-1 text-center text-sm">
          <p>{stage}</p>
          <p className="text-xs text-muted-foreground">
            This can take a few minutes. Keep this page open.
          </p>
        </div>
      )}
      {activeId && (
        <p className="text-center text-sm">
          <Link
            className="underline underline-offset-4"
            href={`/uploads/${activeId}`}
          >
            View this upload and its status
          </Link>
        </p>
      )}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck size={14} /> Private to your account
      </p>
    </div>
  );
}
