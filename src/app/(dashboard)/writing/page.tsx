import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WritingEditor } from "./writing-editor";
import { QuotaIndicator } from "@/components/quota/quota-indicator";
import { getTier } from "@/lib/quotas/get-tier";
import { ProGate } from "@/components/pro-gate";

export default async function WritingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tier = await getTier(supabase, user.id);
  if (tier === "free") {
    return (
      <ProGate
        feature="Writing Feedback"
        description="Get AI-powered grammar feedback on your writing and rephrase individual sentences with one click."
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Writing feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste or write English text, get AI grammar feedback, and rephrase individual sentences.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <QuotaIndicator action="ai_feedback" />
          <QuotaIndicator action="ai_rephrase" />
        </div>
      </div>
      <WritingEditor />
    </div>
  );
}
