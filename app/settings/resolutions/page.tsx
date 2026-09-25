import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/users";
import { listResolutions } from "@/lib/covers/resolutions";
import { SiteHeader } from "@/components/site-header";
import { ResolutionSettings } from "./resolution-settings";

export default async function ResolutionSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const resolutions = await listResolutions(user.id);
  return <>
    <SiteHeader name={user.name} />
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">← Back to your covers</Link>
      <h1 className="mt-6 font-serif text-4xl">Output resolutions</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Save the image sizes you use. Choose one whenever you process a cover.</p>
      <ResolutionSettings initial={resolutions} />
    </main>
  </>;
}
