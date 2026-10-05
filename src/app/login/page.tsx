import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getSessionUser().catch(() => null);

  // Only ever redirect within this site.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (user) redirect(safeNext);

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <div className="card p-8">
        <h1 className="display text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          Use your Google account to see past orders and check out faster. You can also{" "}
          <Link href="/checkout" className="text-ink underline underline-offset-2">
            check out as a guest
          </Link>
          .
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-sale/10 px-3.5 py-3 text-sm text-sale">
            {error}
          </p>
        )}

        <div className="mt-7">
          <GoogleSignInButton next={safeNext} />
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-ink-faint">
          We only ever read your name, email address and profile picture.
        </p>
      </div>
    </div>
  );
}
