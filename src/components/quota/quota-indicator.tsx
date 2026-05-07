import { createClient } from "@/lib/supabase/server";
import { getRemaining } from "@/lib/quotas/remaining";
import type { QuotaAction } from "@/lib/quotas/limits";

export async function QuotaIndicator({ action }: { action: QuotaAction }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { used, limit, remaining, isUnlimited } = await getRemaining(supabase, user.id, action);
  if (isUnlimited) return null;

  const tone =
    remaining === 0
      ? "bg-destructive/10 text-destructive"
      : remaining <= Math.max(1, Math.ceil(limit * 0.2))
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {remaining === 0 ? "Daily limit reached" : `${remaining} of ${limit} left today`}
      <span className="text-[10px] opacity-70">· used {used}</span>
    </span>
  );
}
