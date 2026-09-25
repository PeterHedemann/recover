"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removePasskey, updatePasskeyName } from "@/lib/actions/passkeys";
import { authClient } from "@/lib/auth-client";

type PasskeySummary = { id: string; name: string | null; createdAtLabel: string };

export function PasskeySettings({ passkeys }: { passkeys: PasskeySummary[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addPasskey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await authClient.passkey.addPasskey({ name: newName.trim() || undefined });
        if (result.error) {
          setError(result.error.message ?? "Could not add a passkey. Try again.");
          return;
        }
        setNewName("");
        setMessage("Passkey added.");
        router.refresh();
      } catch {
        setError("Could not add a passkey. Try again.");
      }
    });
  }

  function rename(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updatePasskeyName(id, String(formData.get("name") ?? ""));
      setMessage(result.success ? result.message : null);
      setError(result.success ? null : result.message);
      if (result.success) router.refresh();
    });
  }

  function remove(id: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await removePasskey(id);
      setMessage(result.success ? result.message : null);
      setError(result.success ? null : result.message);
      if (result.success) router.refresh();
    });
  }

  return <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
    <div>
      <h2 className="font-semibold">Passkeys</h2>
      <p className="mt-1 text-sm text-muted-foreground">Use a fingerprint, face scan, device PIN, or security key to sign in without your password.</p>
    </div>
    {passkeys.length ? <ul className="space-y-3">
      {passkeys.map((passkey) => <li key={passkey.id} className="rounded-lg border p-3">
        <form onSubmit={(event) => rename(event, passkey.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm font-medium">Passkey name
            <Input name="name" type="text" maxLength={100} required defaultValue={passkey.name || "My passkey"} />
            <span className="block text-xs font-normal text-muted-foreground">Added {passkey.createdAtLabel}</span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={pending}>Rename</Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => remove(passkey.id)}>Remove</Button>
          </div>
        </form>
      </li>)}
    </ul> : <p className="text-sm text-muted-foreground">No passkeys added yet.</p>}
    <form onSubmit={addPasskey} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 space-y-1 text-sm font-medium">Name for the new passkey
        <Input type="text" maxLength={100} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. This laptop" />
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Waiting for device…" : "Add a passkey"}</Button>
    </form>
    {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
