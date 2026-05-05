import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ListWordsQuerySchema } from "@/lib/schemas/words";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = ListWordsQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const { q, limit, offset } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("user_words")
    .select("id, word_id, created_at, words!inner(word, pos, meaning, ipa_uk, ipa_us)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike("words.word", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("list user_words failed", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  type Row = {
    id: string;
    word_id: string;
    created_at: string;
    words: {
      word: string;
      pos: string | null;
      meaning: string | null;
      ipa_uk: string | null;
      ipa_us: string | null;
    };
  };

  const items = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    word_id: r.word_id,
    word: r.words.word,
    pos: r.words.pos,
    meaning: r.words.meaning,
    ipa_uk: r.words.ipa_uk,
    ipa_us: r.words.ipa_us,
    created_at: r.created_at,
  }));

  const nextOffset = items.length === limit ? offset + items.length : null;
  return NextResponse.json({ items, nextOffset });
}
