"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAccountName, updateAccountPassword } from "@/lib/actions/account";

function Status({ result }: { result: { success: boolean; message: string } | null }) {
  if (!result) return null;
  return <p role={result.success ? "status" : "alert"} className={`text-sm ${result.success ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{result.message}</p>;
}

export function AccountSettings({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [currentName, setCurrentName] = useState(name);
  const [nameResult, setNameResult] = useState<{ success: boolean; message: string } | null>(null);
  const [passwordResult, setPasswordResult] = useState<{ success: boolean; message: string } | null>(null);
  const [namePending, startNameTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startNameTransition(async () => {
      const result = await updateAccountName(formData);
      setNameResult(result);
      if (result.success) {
        setCurrentName(String(formData.get("name") ?? "").trim());
        router.refresh();
      }
    });
  }

  function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startPasswordTransition(async () => {
      const result = await updateAccountPassword(formData);
      setPasswordResult(result);
      if (result.success) form.reset();
    });
  }

  return <div className="mt-8 space-y-6">
    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your name appears in the app. Email changes are not available here.</p>
      </div>
      <div className="space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <Input type="email" value={email} readOnly aria-label="Email address" />
        <p className="text-xs text-muted-foreground">Used to sign in to your account.</p>
      </div>
      <form onSubmit={saveName} className="space-y-3">
        <label htmlFor="account-name" className="block space-y-1 text-sm font-medium">Name
          <Input id="account-name" name="name" type="text" maxLength={100} required value={currentName} onChange={(event) => setCurrentName(event.target.value)} />
        </label>
        <Status result={nameResult} />
        <Button type="submit" disabled={namePending}>{namePending ? "Saving…" : "Save name"}</Button>
      </form>
    </section>

    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter your current password to choose a new one. Other signed-in sessions will be ended.</p>
      </div>
      <form onSubmit={savePassword} className="space-y-4">
        <label htmlFor="current-password" className="block space-y-1 text-sm font-medium">Current password
          <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </label>
        <label htmlFor="new-password" className="block space-y-1 text-sm font-medium">New password
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        </label>
        <label htmlFor="confirm-password" className="block space-y-1 text-sm font-medium">Confirm new password
          <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        </label>
        <Status result={passwordResult} />
        <Button type="submit" disabled={passwordPending}>{passwordPending ? "Updating…" : "Update password"}</Button>
      </form>
    </section>
  </div>;
}
