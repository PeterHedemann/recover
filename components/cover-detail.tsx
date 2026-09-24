"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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

export function CoverDetail({ initial }: { initial: Cover }) {
  const router = useRouter();
  const [cover, setCover] = useState(initial);
  const [title, setTitle] = useState(initial.title || "");
  const [author, setAuthor] = useState(initial.author || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  const processing = cover.status === "processing";
  const endpoint = `/api/uploads/${cover.id}`;

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
        {cover.status === "finished" && (
          <Button asChild>
            <a href={`${endpoint}/image/result?download=1`}>
              <Download size={16} /> Download cover
            </a>
          </Button>
        )}
      </div>
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
            <Card key={kind} className="overflow-hidden shadow-none">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="text-sm font-medium">
                  {kind === "original" ? "Original cover" : "Your new cover"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {kind === "original" ? "As uploaded" : "1072 × 1448"}
                </span>
              </div>
              <CardContent className="flex aspect-[1072/1448] items-center justify-center bg-muted/50 p-5">
                {kind === "original" || cover.status === "finished" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${endpoint}/image/${kind}`}
                      alt={`${kind === "original" ? "Original" : "Processed"} cover of ${cover.title || cover.filename}`}
                      className="max-h-full max-w-full rounded-sm object-contain shadow-lg"
                    />
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
          {(cover.status === "queued" || cover.status === "failed") && (
            <Button className="w-full" disabled={busy} onClick={process}>
              <RotateCcw size={16} />
              {cover.status === "failed" ? "Retry processing" : "Process cover"}
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <a href={`${endpoint}/image/original?download=1`}>
              <Download size={16} /> Download original
            </a>
          </Button>
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
