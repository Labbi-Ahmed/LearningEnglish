import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuotaExceededError } from "./errors";
import {
  isUnlimited,
  limitFor,
  nextResetAt,
  type QuotaAction,
} from "./limits";
import { getTier } from "./get-tier";

export async function assertWithinQuota(
  supabase: SupabaseClient,
  userId: string,
  action: QuotaAction,
): Promise<{ remaining: number; limit: number; tier: import("./limits").Tier }> {
  const tier = await getTier(supabase, userId);

  if (isUnlimited(tier)) {
    return { remaining: Infinity, limit: Infinity, tier };
  }

  const limit = limitFor(tier, action);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("consume_daily_quota", {
    p_user_id: userId,
    p_action: action,
    p_limit: limit,
  });

  if (error) {
    console.error("consume_daily_quota failed", error);
    throw new Error("quota_check_failed");
  }

  const newCount = data as number | null;
  if (newCount === null) {
    throw new QuotaExceededError(action, tier, limit, limit, nextResetAt());
  }

  return { remaining: Math.max(0, limit - newCount), limit, tier };
}
