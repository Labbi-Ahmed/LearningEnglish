import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tier } from "./limits";

export type Plan = {
  id: Tier;
  name: string;
  multiplier: number | null;
  price_cents: number;
  billing_interval: "month" | "year" | "lifetime" | null;
  is_purchasable: boolean;
  sort_order: number;
};

export async function listPlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data } = await supabase
    .from("plans")
    .select("id, name, multiplier, price_cents, billing_interval, is_purchasable, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as Plan[] | null) ?? [];
}

export async function getPlan(
  supabase: SupabaseClient,
  id: Tier,
): Promise<Plan | null> {
  const { data } = await supabase
    .from("plans")
    .select("id, name, multiplier, price_cents, billing_interval, is_purchasable, sort_order")
    .eq("id", id)
    .maybeSingle();
  return (data as Plan | null) ?? null;
}

export function formatPrice(plan: Plan): string {
  if (plan.price_cents === 0) return "Free";
  if (plan.price_cents == null) return "—";
  const dollars = (plan.price_cents / 100).toFixed(plan.price_cents % 100 === 0 ? 0 : 2);
  const interval = plan.billing_interval ? `/${plan.billing_interval[0] === "y" ? "yr" : "mo"}` : "";
  return `$${dollars}${interval}`;
}
