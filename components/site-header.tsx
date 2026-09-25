import Link from "next/link";
import { BookOpen, ArrowUpRight, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutAction } from "@/lib/actions/signout";

export function SiteHeader({ name }: { name?: string }) {
  return (
    <header className="border-b bg-background/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
        >
          <span className="rounded-lg bg-primary p-2 text-primary-foreground">
            <BookOpen size={20} />
          </span>
          recover
        </Link>
        <div className="flex items-center gap-4">
          {name ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings/account"><UserRound size={15} /> Account</Link>
              </Button>
              <form action={SignOutAction}>
                <Button variant="ghost" size="sm">
                  <LogOut size={15} /> Sign out
                </Button>
              </form>
            </>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/signin">
                Sign in <ArrowUpRight size={16} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
