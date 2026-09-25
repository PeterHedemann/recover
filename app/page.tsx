import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/users";
import { listUploads } from "@/lib/covers/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { UploadForm } from "@/components/upload-form";
import { CoverStatus } from "@/components/cover-status";
import { listResolutions } from "@/lib/covers/resolutions";

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
  const resolutions = user ? await listResolutions(user.id) : [];
  return (
    <>
      <SiteHeader name={user?.name} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              A perfect fit for your stories
            </p>
            <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
              Good covers. Perfect fit.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Turn any book cover into the perfect fit for your ebook reader
            </p>
          </div>
        </div>
        <section className="grid gap-7">
          <Card className="shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="text-lg font-semibold">Start with a cover</h2>
              </div>
              {user ? (
                <UploadForm
                  full={!!library && library.total >= library.limit}
                  resolutions={resolutions}
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
