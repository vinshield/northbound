import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requirePublicEnv, serviceRoleKey } from "@/lib/env";

/**
 * Service-role client: bypasses RLS entirely.
 *
 * Only import this from server code that has already authorised the caller
 * (admin actions, the Paystack webhook, checkout). Never from a component
 * that could be rendered on the client.
 */
export function createAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  return createSupabaseClient(supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
