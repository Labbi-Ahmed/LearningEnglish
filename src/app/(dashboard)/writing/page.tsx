import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WritingEditor } from "./writing-editor";

export default async function WritingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Writing feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste or write English text, get AI grammar feedback, and rephrase individual sentences.
        </p>
      </div>
      <WritingEditor />
    </div>
  );
}
