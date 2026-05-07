import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDailyUsageSummary } from "@/lib/quotas/summary";
import { TIER_LABEL } from "@/lib/quotas/limits";
import { listPlans, formatPrice } from "@/lib/quotas/plans";
import { UsageRow } from "@/components/quota/usage-row";
import { ResetCountdown } from "@/components/quota/reset-countdown";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [summary, plans] = await Promise.all([
    getDailyUsageSummary(supabase, user.id),
    listPlans(supabase),
  ]);
  const isAuthor = summary.tier === "author";

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Daily usage</h1>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            {TIER_LABEL[summary.tier]}
          </span>
        </div>
        {isAuthor ? (
          <p className="text-sm text-muted-foreground">
            You have unlimited access to every feature.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Resets in <ResetCountdown resetsAt={summary.resetsAt} /> (UTC midnight).
          </p>
        )}
      </header>

      <div className="space-y-2">
        {summary.items.map((item) => (
          <UsageRow key={item.action} item={item} />
        ))}
      </div>

      {plans.length > 0 ? (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold tracking-tight">Plans</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const current = p.id === summary.tier;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 space-y-1.5 ${current ? "border-primary bg-primary/5" : "bg-card"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    {current ? (
                      <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(p)}
                    {p.multiplier == null ? " · Unlimited" : p.multiplier === 1 ? "" : ` · ${p.multiplier}× limits`}
                  </p>
                  {p.is_purchasable ? (
                    <p className="text-xs text-muted-foreground italic">Coming soon</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
