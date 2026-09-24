import Link from "next/link";
import { ArrowRight, BookOpen, Expand, ScanText, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/users";
import { listUploads } from "@/lib/covers/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { UploadForm } from "@/components/upload-form";
import { CoverStatus } from "@/components/cover-status";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  const requested = Number((await searchParams).page || 1);
  const page =
    Number.isInteger(requested) && requested > 0 && requested <= 10000
      ? requested
      : 1;
  const library = user ? await listUploads(user.id, page) : null;
  return (
    <>
      <SiteHeader name={user?.name} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              A little more room for your stories
            </p>
            <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
              Good covers. Perfect fit.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Turn a book cover into a beautifully extended image, ready for
              your next read.
            </p>
          </div>
          <span className="rounded-full border bg-card px-4 py-2 text-xs font-medium text-primary">
            1072 × 1448 px · Every time
          </span>
        </div>
        <section className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  01 /
                </span>
                <h2 className="text-lg font-semibold">Start with a cover</h2>
              </div>
              {user ? (
                <UploadForm
                  full={!!library && library.total >= library.limit}
                />
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-background p-8 text-center">
                  <BookOpen
                    className="mb-5 text-primary"
                    size={40}
                    strokeWidth={1}
                  />
                  <h3 className="font-serif text-2xl">
                    Your next chapter starts here.
                  </h3>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Create your private cover collection. Upload an image and
                    let us take care of the fit.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/signup">
                      Create an account <ArrowRight size={16} />
                    </Link>
                  </Button>
                  <Link
                    href="/signin"
                    className="mt-4 text-sm underline underline-offset-4"
                  >
                    Already a member? Sign in
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col justify-between rounded-xl bg-[#e9ede4] p-7 sm:p-9">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                Made for your library
              </p>
              <h2 className="mt-4 max-w-sm font-serif text-3xl leading-tight">
                The same story.
                <br />A little more canvas.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                We keep the original cover intact and use AI to extend the
                artwork around it. No stretched lettering. No cropped titles.
              </p>
            </div>
            <div
              className="my-8 flex items-center justify-center gap-5"
              aria-hidden="true"
            >
              <div className="flex h-32 w-22 items-center justify-center rounded-sm bg-[#365749] p-3 text-center font-serif text-lg text-[#f4e8bd] shadow-lg">
                A world
                <br />
                within
              </div>
              <ArrowRight className="text-primary/50" size={22} />
              <div className="flex h-40 w-30 items-center justify-center rounded-sm bg-[#b5c7a7] shadow-lg">
                <div className="flex h-32 w-22 items-center justify-center bg-[#365749] p-3 text-center font-serif text-lg text-[#f4e8bd]">
                  A world
                  <br />
                  within
                </div>
              </div>
            </div>
            <div className="space-y-4 border-t border-primary/15 pt-6">
              {[
                [
                  Expand,
                  "A precise fit",
                  "Exactly 1072 × 1448 pixels, ready to download.",
                ],
                [
                  ScanText,
                  "Book details, discovered",
                  "Title and author read from your original cover.",
                ],
                [
                  BookOpen,
                  "A collection to come back to",
                  "Your originals and finished covers, in one place.",
                ],
              ].map(([Icon, title, description]) => {
                const Glyph = Icon as typeof Expand;
                return (
                  <div key={String(title)} className="flex gap-3">
                    <Glyph
                      className="mt-0.5 shrink-0 text-primary"
                      size={18}
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-sm font-medium">{String(title)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {String(description)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {library && (
          <section className="mt-14" aria-labelledby="library-title">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Your bookshelf
                </p>
                <h2 id="library-title" className="font-serif text-3xl">
                  Cover collection
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {library.total} / {library.limit} covers
              </p>
            </div>
            {!library.total ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <Sparkles
                  className="mx-auto mb-4 text-primary/60"
                  size={28}
                  strokeWidth={1.5}
                />
                <h3 className="font-medium">
                  A fresh shelf, ready for stories.
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your uploaded covers will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {library.items.map((cover) => (
                  <Link
                    key={cover.id}
                    href={`/uploads/${cover.id}`}
                    className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-52 items-center justify-center bg-muted/70 p-5 sm:h-60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/uploads/${cover.id}/image/thumbnail`}
                        alt={cover.title || cover.filename}
                        loading="lazy"
                        className="max-h-full max-w-full rounded-sm object-contain shadow-md transition-transform group-hover:-translate-y-1"
                      />
                    </div>
                    <div className="space-y-2 p-4">
                      <CoverStatus status={cover.status} />
                      <h3 className="truncate font-medium">
                        {cover.title || cover.filename}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {cover.author || "Author not identified"}
                      </p>
                      <p className="pt-1 text-xs text-muted-foreground">
                        {cover.createdAt.toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {library.pages > 1 && (
              <nav
                aria-label="Library pages"
                className="mt-7 flex items-center justify-center gap-4"
              >
                {page > 1 && (
                  <Button asChild variant="outline">
                    <Link href={`/?page=${page - 1}`}>Previous</Link>
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  Page {page} of {library.pages}
                </span>
                {page < library.pages && (
                  <Button asChild variant="outline">
                    <Link href={`/?page=${page + 1}`}>Next</Link>
                  </Button>
                )}
              </nav>
            )}
          </section>
        )}
        <footer className="mt-14 border-t pt-6 text-xs text-muted-foreground">
          Recover · A new chapter for your covers.
        </footer>
      </main>
    </>
  );
}
