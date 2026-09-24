import Link from "next/link";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Create an account</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign up</h1>

        <SignUpForm />

        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}
