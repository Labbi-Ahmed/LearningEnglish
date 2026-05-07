import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "./chat-window";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">AI tutor chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Practice conversational English with an AI tutor. Conversations persist for your session.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
