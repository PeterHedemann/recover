"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignInAction, type SignInFormData } from "@/lib/actions/signin";
import { authClient } from "@/lib/auth-client";
import type { FormState } from "@/lib/utils";

const initialState: FormState<SignInFormData> = {
  status: "initial",
};

export function SignInForm() {
  const router = useRouter();
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyPending, startPasskeyTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    SignInAction,
    initialState,
  );

  const formErrors = state.status === "error" ? state.errors.formErrors : [];
  const fieldErrors =
    state.status === "error" ? state.errors.fieldErrors : undefined;

  function signInWithPasskey() {
    setPasskeyError(null);
    startPasskeyTransition(async () => {
      try {
        const result = await authClient.signIn.passkey();
        if (result.error) {
          setPasskeyError(result.error.message ?? "Passkey sign-in failed. Try again.");
          return;
        }
        router.replace("/");
        router.refresh();
      } catch {
        setPasskeyError("Passkey sign-in failed. Try again.");
      }
    });
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {formErrors.length > 0 && (
        <div
          aria-live="polite"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {formErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <label className="block text-sm font-medium">
        Email
        <Input
          name="email"
          type="email"
          required
          defaultValue={state.data?.email}
          aria-invalid={Boolean(fieldErrors?.email)}
          aria-describedby={fieldErrors?.email ? "email-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-950"
        />
      </label>
      {fieldErrors?.email && (
        <p id="email-error" className="-mt-2 text-sm text-red-700">
          {fieldErrors.email[0]}
        </p>
      )}

      <label className="block text-sm font-medium">
        Password
        <Input
          name="password"
          type="password"
          required
          aria-invalid={Boolean(fieldErrors?.password)}
          aria-describedby={
            fieldErrors?.password ? "password-error" : undefined
          }
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-950"
        />
      </label>
      {fieldErrors?.password && (
        <p id="password-error" className="-mt-2 text-sm text-red-700">
          {fieldErrors.password[0]}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
      >
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <div className="relative py-1" aria-hidden="true">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-zinc-500">or</span></div>
      </div>
      {passkeyError && <p role="alert" className="text-sm text-red-700">{passkeyError}</p>}
      <Button type="button" variant="outline" onClick={signInWithPasskey} disabled={pending || passkeyPending} className="w-full">
        {passkeyPending ? "Waiting for passkey…" : "Sign in with a passkey"}
      </Button>
    </form>
  );
}
