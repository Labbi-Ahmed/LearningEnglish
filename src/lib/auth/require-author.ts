import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ForbiddenError, UnauthorizedError } from "./errors";

export async function requireAuthor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new ForbiddenError();
  const tier = (data as { tier?: string } | null)?.tier;
  if (tier !== "author") throw new ForbiddenError();

  return { user, supabase, supabaseAdmin };
}
