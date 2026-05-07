import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "./chat-window";
import { QuotaIndicator } from "@/components/quota/quota-indicator";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">AI tutor chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Practice conversational English with an AI tutor. Conversations persist for your session.
          </p>
        </div>
        <QuotaIndicator action="ai_chat" />
      </div>
      <ChatWindow />
    </div>
  );
}
