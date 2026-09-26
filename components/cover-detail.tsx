"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  LoaderCircle,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CoverStatus } from "@/components/cover-status";
import { responseData } from "@/components/upload-form";
import { type Cover, stageLabels } from "@/lib/covers/types";
import { BOOX_ADDRESS_KEY } from "@/app/settings/boox-settings";

export function CoverDetail({ initial }: { initial: Cover }) {
  const router = useRouter();
  const [cover, setCover] = useState(initial);
  const [title, setTitle] = useState(initial.title || "");
  const [author, setAuthor] = useState(initial.author || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [booxAddress, setBooxAddress] = useState("");
  const [booxBusy, setBooxBusy] = useState(false);
  const [booxResult, setBooxResult] = useState<{ success: boolean; message: string } | null>(null);
  const locked = useRef(false);
  const processing = cover.status === "processing";
  const endpoint = `/api/uploads/${cover.id}`;

  useEffect(() => {
    setBooxAddress(window.localStorage.getItem(BOOX_ADDRESS_KEY)?.trim() || "");
  }, []);

  useEffect(() => {
    if (!processing) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const next = await responseData(
          await fetch(endpoint, { cache: "no-store" }),
        );
        if (cancelled) return;
        setCover(next);
        if (next.status === "finished") {
          setTitle(next.title || "");
          setAuthor(next.author || "");
        }
      } catch {
        /* Retry status reads while the synchronous processing request completes. */
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [processing, endpoint]);

  async function process() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCover((value) => ({
      ...value,
      status: "processing",
      stage: "preparing",
      error: null,
    }));
    try {
      const next = await responseData(
        await fetch(`${endpoint}/process`, { method: "POST" }),
      );
      setCover(next);
      setTitle(next.title || "");
      setAuthor(next.author || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Processing failed.");
      try {
        setCover(
          await responseData(await fetch(endpoint, { cache: "no-store" })),
        );
      } catch {
        setCover((value) => ({ ...value, status: "failed", stage: null }));
      }
    } finally {
      locked.current = false;
      setBusy(false);
      router.refresh();
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await responseData(
        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author }),
        }),
      );
      setCover(next);
      setNotice("Book details saved.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save details.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function uploadToBoox() {
    const address = booxAddress.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (!address) return;
    setBooxBusy(true);
    setBooxResult(null);
    try {
      let readerIsAvailable = false;
      try {
        const ping = await fetch(`http://${address}/api/ping`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        readerIsAvailable = ping.ok && (await ping.text()).trim() === "ok";
      } catch {
        // Network errors and browser abort messages are replaced with one clear message below.
      }
      if (!readerIsAvailable) {
        throw new Error("Could not reach your BOOX reader. Check its IP address and make sure it is on the same network.");
      }
      const imageResponse = await fetch(`${endpoint}/image/result`, { cache: "no-store" });
      if (!imageResponse.ok) throw new Error("Could not load the transformed image.");
      const image = await imageResponse.blob();
      const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
      const nameParts = [cover.title, cover.author]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part));
      const baseName = nameParts
        .join(" ")
        .normalize("NFKD")
        .replace(/[\p{Diacritic}]/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120)
        .replace(/-$/, "") || `cover-${cover.id}`;
      const form = new FormData();
      form.append("file", new File([image], `${baseName}.${extension}`, { type: image.type || "image/jpeg" }));
      form.append("dir", "/storage/emulated/0/Screensaver");
      const upload = await fetch(`http://${address}/api/storage/upload`, { method: "POST", body: form });
      if (!upload.ok) throw new Error("The BOOX reader could not save the image.");
      setBooxResult({ success: true, message: "Transformed cover uploaded to your BOOX reader." });
    } catch (cause) {
      setBooxResult({
        success: false,
        message: cause instanceof Error ? cause.message : "Could not upload the cover to BOOX.",
      });
    } finally {
      setBooxBusy(false);
    }
  }

  async function remove() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await responseData(await fetch(endpoint, { method: "DELETE" }));
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete cover.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to your collection
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <CoverStatus status={cover.status} />
          <h1 className="mt-3 break-words font-serif text-3xl sm:text-4xl">
            {cover.title || cover.filename}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {cover.author || "Book details will appear here"}
          </p>
        </div>
      </div>
      <AlertDialog open={booxResult !== null} onOpenChange={(open) => { if (!open) setBooxResult(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader className="!place-items-center !text-center">
            <div className={`mb-2 flex size-14 items-center justify-center rounded-full ${booxResult?.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {booxResult?.success ? <CheckCircle2 size={28} /> : <CircleAlert size={28} />}
            </div>
            <AlertDialogTitle>{booxResult?.success ? "Upload complete" : "Upload failed"}</AlertDialogTitle>
            <AlertDialogDescription>{booxResult?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center">
            <AlertDialogAction onClick={() => setBooxResult(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {(error || cover.error) && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {error || cover.error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-accent p-4 text-sm text-primary"
        >
          {notice}
        </p>
      )}
      {processing && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border bg-card p-5"
        >
          <LoaderCircle className="shrink-0 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">
              {stageLabels[cover.stage || ""] || "Processing your cover…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This may take a few minutes. Keep this page open.
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5 sm:grid-cols-2">
          {(["original", "result"] as const).map((kind) => (
            <Card key={kind} className="overflow-hidden pb-0 shadow-none">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="text-sm font-medium">
                  {kind === "original" ? "Original cover" : "Your new cover"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {kind === "original"
                    ? "As uploaded"
                    : `${cover.outputWidth ?? 1072} × ${cover.outputHeight ?? 1448} px`}
                </span>
              </div>
              <CardContent
                className="flex items-center justify-center bg-muted/50 p-5"
                style={kind === "result" ? { aspectRatio: `${cover.outputWidth ?? 1072} / ${cover.outputHeight ?? 1448}` } : { aspectRatio: "1072 / 1448" }}
              >
                {kind === "original" || cover.status === "finished" ? (
                  <>
                    <a
                      href={`${endpoint}/image/${kind}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${kind === "original" ? "original" : "transformed"} cover in a new tab`}
                      className="cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${endpoint}/image/${kind}`}
                        alt={`${kind === "original" ? "Original" : "Processed"} cover of ${cover.title || cover.filename}`}
                        className="max-h-full max-w-full rounded-sm object-contain shadow-lg"
                      />
                    </a>
                  </>
                ) : (
                  <div className="px-5 text-center">
                    <p className="font-serif text-2xl text-primary/60">
                      Room for the story.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Your finished cover will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
              {(kind === "original" || cover.status === "finished") && (
                <div className="mt-auto border-t p-4">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <a href={`${endpoint}/image/${kind}?download=1`}>
                      <Download size={16} />
                      Download {kind === "original" ? "original" : "transformed"}
                    </a>
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
        <aside className="space-y-5">
          <Card className="shadow-none">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Book details</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Read from your cover. Make a correction if needed.
              </p>
              {cover.metadataWarning && (
                <p className="mt-4 rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  {cover.metadataWarning}
                </p>
              )}
              <form onSubmit={save} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="book-title"
                    className="mb-2 block text-sm font-medium"
                  >
                    Title
                  </label>
                  <Input
                    id="book-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={500}
                    placeholder="Book title"
                    disabled={cover.status !== "finished" || busy}
                  />
                </div>
                <div>
                  <label
                    htmlFor="book-author"
                    className="mb-2 block text-sm font-medium"
                  >
                    Author
                  </label>
                  <Input
                    id="book-author"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    maxLength={500}
                    placeholder="Author name"
                    disabled={cover.status !== "finished" || busy}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={busy || cover.status !== "finished"}
                >
                  <Save size={16} /> Save details
                </Button>
              </form>
            </CardContent>
          </Card>
          {cover.status === "finished" && (
            <Card className="shadow-none">
              <CardContent className="p-5">
                <h2 className="font-semibold">BOOX Screensaver</h2>
                {!booxAddress && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter your BOOX reader’s IP address on the <Link href="/settings" className="underline underline-offset-4">Settings page</Link> to upload this image.
                  </p>
                )}
                <Button className="mt-4 w-full" disabled={booxBusy || busy || !booxAddress} onClick={uploadToBoox}>
                  {booxBusy ? <LoaderCircle className="animate-spin" size={16} /> : null}
                  {booxBusy ? "Uploading…" : "Upload to BOOX"}
                </Button>
              </CardContent>
            </Card>
          )}
          {(cover.status === "queued" || cover.status === "failed") && (
            <Button className="w-full" disabled={busy} onClick={process}>
              <RotateCcw size={16} />
              {cover.status === "failed" ? "Retry processing" : "Process cover"}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full text-destructive"
                disabled={busy || processing}
              >
                <Trash2 size={16} /> Delete cover
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this cover?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the original, processed image, and
                  book details from your collection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep cover</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>
                  Delete cover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-center text-xs text-muted-foreground">
            Uploaded {cover.createdAt.slice(0, 10)} · Private to you
          </p>
        </aside>
      </div>
    </main>
  );
}
