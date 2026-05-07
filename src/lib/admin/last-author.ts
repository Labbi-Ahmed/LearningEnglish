import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export class LastActiveAuthorError extends Error {
  readonly status = 409 as const;
  constructor() {
    super("last_active_author");
    this.name = "LastActiveAuthorError";
  }
}

/**
 * Throws LastActiveAuthorError when the target is the only remaining
 * author whose profile is still active. Used by deactivate and delete
 * to prevent locking the admin surface out of the app.
 */
export async function assertNotLastActiveAuthor(
  supabaseAdmin: SupabaseClient,
  targetId: string,
) {
  const { data: targetSub } = await supabaseAdmin
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", targetId)
    .maybeSingle();
  const targetTier = (targetSub as { tier?: string } | null)?.tier;
  if (targetTier !== "author") return;

  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("is_active")
    .eq("id", targetId)
    .maybeSingle();
  const targetActive = (targetProfile as { is_active?: boolean } | null)?.is_active ?? true;
  if (!targetActive) return;

  const { data: authors } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id, profiles!inner(is_active)")
    .eq("tier", "author");

  const activeAuthors = (authors ?? []).filter((row) => {
    const profile = (row as { profiles?: { is_active?: boolean } | { is_active?: boolean }[] }).profiles;
    const flag = Array.isArray(profile) ? profile[0]?.is_active : profile?.is_active;
    return flag !== false;
  });

  if (activeAuthors.length <= 1) throw new LastActiveAuthorError();
}
