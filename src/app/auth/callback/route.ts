import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase redirects here after Google sign-in with a one-time code, which we
 * exchange for a session cookie. `next` carries the page the user was trying
 * to reach before being bounced to /login.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  // Only allow same-origin redirects, so the callback can't be used as an
  // open redirect to another site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (oauthError) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", oauthError);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
