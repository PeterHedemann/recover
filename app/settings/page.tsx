import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/users";
import { listResolutions } from "@/lib/covers/resolutions";
import { SiteHeader } from "@/components/site-header";
import { ResolutionSettings } from "./resolutions/resolution-settings";
import { BooxSettings } from "./boox-settings";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const resolutions = await listResolutions(user.id);
  return <>
    <SiteHeader name={user.name} />
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">← Back to your covers</Link>
      <h1 className="mt-6 font-serif text-4xl">Settings</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Configure your BOOX reader and the output sizes used for transformed covers.</p>
      <section className="mt-8 rounded-xl border p-5 sm:p-6" aria-labelledby="boox-settings-title">
        <h2 id="boox-settings-title" className="text-lg font-semibold">BOOX reader</h2>
        <p className="mt-2 text-sm text-muted-foreground">Enter the reader’s IP address and port on your local network.</p>
        <BooxSettings />
      </section>
      <section className="mt-10" aria-labelledby="resolution-settings-title">
        <h2 id="resolution-settings-title" className="font-serif text-2xl">Output resolutions</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Save the image sizes you use. Choose one whenever you process a cover.</p>
        <ResolutionSettings initial={resolutions} />
      </section>
    </main>
  </>;
}
