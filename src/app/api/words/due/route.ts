import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DueQuerySchema, type DueItem } from "@/lib/schemas/review";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = DueQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_words")
    .select(
      "id, word_id, next_review_at, ease_factor, interval_days, repetitions, words!inner(word, meaning, example, ipa_uk, ipa_us)",
    )
    .eq("user_id", user.id)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(parsed.data.limit);

  if (error) {
    console.error("due query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Row[];
  const items: DueItem[] = rows.map((r) => ({
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

  return NextResponse.json({ items, count: items.length }, { status: 200 });
}
