import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">This cover isn’t on your shelf.</h1>
      <p className="my-5 text-muted-foreground">
        It may have been deleted, or you may need a different account.
      </p>
      <Button asChild>
        <Link href="/">Back to your collection</Link>
      </Button>
    </main>
  );
}
