import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, getServiceRoleKey } from "@/lib/env";

export function createAdminClient() {
  return createSupabaseClient(env.SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
