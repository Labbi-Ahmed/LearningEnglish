import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTION_LABEL,
  QUOTA_ACTIONS,
  isUnlimited,
  limitFor,
  nextResetAt,
  type QuotaAction,
  type Tier,
} from "./limits";
import { getTier } from "./get-tier";

export type UsageItem = {
  action: QuotaAction;
  label: string;
  used: number;
  limit: number;
  percent: number;
  isUnlimited: boolean;
};

export type UsageSummary = {
  tier: Tier;
  resetsAt: string; // ISO
  items: UsageItem[];
};

function todayUtc(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export async function getDailyUsageSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageSummary> {
  const tier = await getTier(supabase, userId);
  const unlimited = isUnlimited(tier);

  const { data } = await supabase
    .from("daily_usage")
    .select("action, count")
    .eq("user_id", userId)
    .eq("day", todayUtc());

  const usedByAction = new Map<string, number>();
  (data ?? []).forEach((row: { action: string; count: number }) => {
    usedByAction.set(row.action, row.count);
  });

  const items: UsageItem[] = QUOTA_ACTIONS.map((action) => {
    const used = usedByAction.get(action) ?? 0;
    if (unlimited) {
      return { action, label: ACTION_LABEL[action], used, limit: Infinity, percent: 0, isUnlimited: true };
    }
    const limit = limitFor(tier, action);
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return { action, label: ACTION_LABEL[action], used, limit, percent, isUnlimited: false };
  });

  return {
    tier,
    resetsAt: nextResetAt().toISOString(),
    items,
  };
}
