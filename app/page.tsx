import { getCurrentUser } from "@/lib/users";
import { SignOutAction } from "@/lib/actions/signout";
import Link from "next/link";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">
          Authentication status
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {user ? "You are logged in." : "You are logged out."}
        </h1>

        <div className="mt-6 rounded-md bg-zinc-100 p-4 text-sm text-zinc-700">
          {user ? (
            <div className="space-y-1">
              <p>
                <span className="font-medium text-zinc-950">Name:</span>{" "}
                {user.name}
              </p>
              <p>
                <span className="font-medium text-zinc-950">Email:</span>{" "}
                {user.email}
              </p>
            </div>
          ) : (
            <p>No active BetterAuth session was found.</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {user ? (
            <form action={SignOutAction}>
              <button
                type="submit"
                className="inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/signin"
                className="inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
