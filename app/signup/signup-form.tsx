"use client";

import { useActionState } from "react";
import { SignUpAction, type SignUpFormData } from "@/lib/actions/signup";
import type { FormState } from "@/lib/utils";

const initialState: FormState<SignUpFormData> = {
  status: "initial",
};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    SignUpAction,
    initialState,
  );

  const formErrors = state.status === "error" ? state.errors.formErrors : [];
  const fieldErrors =
    state.status === "error" ? state.errors.fieldErrors : undefined;

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
        Name
        <input
          name="name"
          type="text"
          required
          defaultValue={state.data?.name}
          aria-invalid={Boolean(fieldErrors?.name)}
          aria-describedby={fieldErrors?.name ? "name-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-950"
        />
      </label>
      {fieldErrors?.name && (
        <p id="name-error" className="-mt-2 text-sm text-red-700">
          {fieldErrors.name[0]}
        </p>
      )}

      <label className="block text-sm font-medium">
        Email
        <input
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
        <input
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

      <label className="block text-sm font-medium">
        Repeat password
        <input
          name="repeatPassword"
          type="password"
          required
          aria-invalid={Boolean(fieldErrors?.repeatPassword)}
          aria-describedby={
            fieldErrors?.repeatPassword ? "repeat-password-error" : undefined
          }
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-950"
        />
      </label>
      {fieldErrors?.repeatPassword && (
        <p id="repeat-password-error" className="-mt-2 text-sm text-red-700">
          {fieldErrors.repeatPassword[0]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
