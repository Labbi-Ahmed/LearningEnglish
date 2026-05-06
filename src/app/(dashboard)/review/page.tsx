import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "./review-session";
import type { DueItem } from "@/lib/schemas/review";

type Row = {
  id: string;
  word_id: string;
  next_review_at: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  words: {
    word: string;
    meaning: string | null;
    example: string | null;
    ipa_uk: string | null;
    ipa_us: string | null;
  };
};

async function fetchDue(): Promise<DueItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("user_words")
    .select(
      "id, word_id, next_review_at, ease_factor, interval_days, repetitions, words!inner(word, meaning, example, ipa_uk, ipa_us)",
    )
    .eq("user_id", user.id)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(20);

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    user_word_id: r.id,
    word_id: r.word_id,
    word: r.words.word,
    meaning: r.words.meaning,
    example: r.words.example,
    ipa_uk: r.words.ipa_uk,
    ipa_us: r.words.ipa_us,
    next_review_at: r.next_review_at,
    ease_factor: r.ease_factor,
    interval_days: r.interval_days,
    repetitions: r.repetitions,
  }));
}

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await fetchDue();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Daily review</h1>
        <p className="text-sm text-muted-foreground">
          Spaced-repetition queue. Use 1 / 2 / 3 / 4 keys for Again / Hard / Good /
          Easy.
        </p>
      </div>
      <ReviewSession initialItems={items} />
    </div>
  );
}
