import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Recorder } from "./recorder";

type Recording = {
  id: string;
  target_text: string | null;
  accuracy_score: number | null;
  created_at: string;
};

const PROMPTS = [
  "The weather today is sunny and warm.",
  "I enjoy learning new English words every day.",
  "Please could you help me find the nearest station?",
  "She decided to travel to a foreign country next summer.",
  "Reading books is a great way to improve your vocabulary.",
];

async function fetchHistory(userId: string): Promise<Recording[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("speaking_recordings")
    .select("id, target_text, accuracy_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Recording[];
}

export default async function SpeakingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const history = await fetchHistory(user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Speaking practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read the prompt aloud. Your accuracy score is based on word-level matching.
        </p>
      </div>

      <Recorder prompts={PROMPTS} />

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">History</h2>
          <ul className="space-y-2">
            {history.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4"
              >
                <p className="text-sm truncate flex-1">{r.target_text ?? "—"}</p>
                {r.accuracy_score != null && (
                  <span
                    className={`text-sm font-semibold shrink-0 ${
                      r.accuracy_score >= 80
                        ? "text-green-600"
                        : r.accuracy_score >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {r.accuracy_score}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
