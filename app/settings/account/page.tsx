import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/users";
import { AccountSettings } from "./account-settings";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return <>
    <SiteHeader name={user.name} />
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">← Back to your covers</Link>
      <h1 className="mt-6 font-serif text-4xl">Account</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Update your name and password. Your email address is your sign-in username.</p>
      <AccountSettings name={user.name} email={user.email} />
    </main>
  </>;
}
