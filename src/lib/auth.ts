import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bootstrapAdminEmails } from "@/lib/env";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

/** The signed-in user plus their profile, or null for a guest. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Read the profile with the service role: the profiles RLS policy allows
  // self-reads, but this also covers the brief window before the signup
  // trigger has committed the row.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url, is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  const email = (profile?.email ?? user.email ?? "").toLowerCase();

  return {
    id: user.id,
    email,
    fullName:
      profile?.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
    // ADMIN_EMAILS exists so the very first admin can get in before anyone
    // has been able to flip is_admin in the database.
    isAdmin: Boolean(profile?.is_admin) || bootstrapAdminEmails().includes(email),
  };
}

/** Throws unless the caller is an admin. Use at the top of every admin action. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("You must be signed in.");
  if (!user.isAdmin) throw new Error("You do not have access to this area.");
  return user;
}
