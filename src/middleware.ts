import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image files, and the Paystack webhook.
     *
     * The session cookie only needs refreshing on requests that render or
     * mutate. The webhook carries no cookies, so running an auth round-trip
     * on it would only add latency to payment settlement.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
