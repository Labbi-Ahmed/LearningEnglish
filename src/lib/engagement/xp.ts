import type { SupabaseClient } from "@supabase/supabase-js";
import type { XpSource } from "@/lib/schemas/engagement";
import { recomputeStreak } from "./streak";
import { evaluateBadges } from "./badges";

export const XP_AMOUNTS: Record<XpSource, number> = {
  game:          10,
  review:         5,
  lesson:        20,
  speaking:      15,
  chat:           5,
  streak_bonus:  25,
};

export async function grantXp(
  client: SupabaseClient,
  params: {
    userId: string;
    source: XpSource;
    refId: string;
    amount?: number;
  },
): Promise<void> {
  const { userId, source, refId, amount = XP_AMOUNTS[source] } = params;

  // Insert ledger row — unique (user_id, source, ref_id) makes this idempotent
  const { error: insertError } = await client
    .from("user_xp_events")
    .insert({ user_id: userId, source, ref_id: refId, amount });

  if (insertError) {
    // code 23505 = unique_violation → duplicate grant, skip silently
    if (insertError.code === "23505") return;
    console.error("[grantXp] insert failed:", insertError.message);
    return;
  }

  // Recompute total XP from ledger (accurate, avoids race-prone increment)
  const { data: events } = await client
    .from("user_xp_events")
    .select("amount")
    .eq("user_id", userId);

  const totalXp = (events ?? []).reduce(
    (sum: number, r: { amount: number }) => sum + r.amount,
    0,
  );

  await client.from("profiles").update({ xp: totalXp }).eq("id", userId);

  // Recompute streak + evaluate badges synchronously
  await recomputeStreak(client, userId);
  await evaluateBadges(client, userId);
}
