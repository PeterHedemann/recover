import { getCurrentUser } from "@/lib/users";
import Link from "next/link";

export default async function SignedOutPage() {
  const user = await getCurrentUser();
  const isSignedOut = user === null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">
          {isSignedOut ? "Signed out" : "Sign out failed"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {isSignedOut
            ? "You have been signed out."
            : "You are still signed in."}
        </h1>

        {!isSignedOut && (
          <p className="mt-4 text-sm text-zinc-700">
            We could not confirm that your session ended. Please try signing out
            again.
          </p>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}
