import type { UsageItem } from "@/lib/quotas/summary";

export function UsageRow({ item }: { item: UsageItem }) {
  if (item.isUnlimited) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <span className="text-sm font-medium">{item.label}</span>
        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
          Unlimited
        </span>
      </div>
    );
  }

  const atLimit = item.percent >= 100;
  const near = item.percent >= 80;
  const barColor = atLimit ? "bg-destructive" : near ? "bg-amber-500" : "bg-primary";

  return (
    <div className="rounded-lg border bg-card px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{item.label}</span>
        <span className={`text-xs tabular-nums ${atLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {atLimit ? "Limit reached" : `${item.used} / ${item.limit}`} · {item.percent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor} transition-[width] duration-300`}
          style={{ width: `${Math.min(100, item.percent)}%` }}
        />
      </div>
    </div>
  );
}
