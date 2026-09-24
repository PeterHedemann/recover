"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">We couldn’t open your library.</h1>
      <p className="my-5 text-muted-foreground">
        Please try again in a moment. If a cover was processing, check its
        status before starting again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
