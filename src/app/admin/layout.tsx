import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getSessionUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/login?next=/admin");

  // Every admin server action re-checks this; the layout gate is only the
  // first line of defence, not the only one.
  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="display text-2xl font-bold">Not your area</h1>
        <p className="mt-3 text-ink-muted">
          Signed in as {user.email}, which does not have admin access. Add the address to{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-sm">ADMIN_EMAILS</code> or set{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-sm">is_admin</code> on the profile
          row.
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-1 text-3xl font-bold tracking-tight">Store management</h1>
        </div>
        <span className="text-sm text-ink-faint">{user.email}</span>
      </header>

      <AdminNav />

      <div className="mt-8">{children}</div>
    </div>
  );
}
