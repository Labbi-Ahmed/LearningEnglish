import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnlimited, limitFor, type QuotaAction } from "./limits";
import { getTier } from "./get-tier";

function todayUtc(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export async function getRemaining(
  supabase: SupabaseClient,
  userId: string,
  action: QuotaAction,
): Promise<{ used: number; limit: number; remaining: number; isUnlimited: boolean }> {
  const tier = await getTier(supabase, userId);
  if (isUnlimited(tier)) {
    return { used: 0, limit: Infinity, remaining: Infinity, isUnlimited: true };
  }
  const limit = limitFor(tier, action);

  const { data } = await supabase
    .from("daily_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("day", todayUtc())
    .maybeSingle();

  const used = (data as { count?: number } | null)?.count ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), isUnlimited: false };
}
