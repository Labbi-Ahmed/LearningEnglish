import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tier } from "./limits";

const cache = new Map<string, Tier>();

export async function getTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<Tier> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const { data } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  const tier = ((data as { tier?: string } | null)?.tier ?? "free") as Tier;
  cache.set(userId, tier);
  return tier;
}

export function clearTierCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
