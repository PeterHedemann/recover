import Link from "next/link";
import { SignInForm } from "./signin-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>

        <SignInForm />

        <div className="mt-6 flex gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-600 hover:text-zinc-950">
            Back home
          </Link>
          <Link href="/signup" className="text-zinc-600 hover:text-zinc-950">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
