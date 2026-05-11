import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ListWordsQuerySchema } from "@/lib/schemas/words";
import {
  getSavedListFromCache,
  putSavedListInCache,
  type SavedListEntry,
} from "@/lib/cache/saved-list";
import { hydrateSavedSet } from "@/lib/cache/saved-set";

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

  // ── Cache path ────────────────────────────────────────────────────────────
  try {
    let entries = await getSavedListFromCache(user.id);

    if (!entries) {
      // Miss: load the full list from DB, populate both caches, then serve.
      const { data, error } = await supabase
        .from("user_words")
        .select("id, word_id, created_at, words!inner(word, pos, meaning, ipa_uk, ipa_us)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

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

      const rows = (data ?? []) as unknown as Row[];
      entries = rows.map((r) => ({
        id: r.id,
        word_id: r.word_id,
        word: r.words.word,
        pos: r.words.pos,
        meaning: r.words.meaning,
        ipa_uk: r.words.ipa_uk,
        ipa_us: r.words.ipa_us,
        created_at: r.created_at,
      }));

      await putSavedListInCache(user.id, entries);
      await hydrateSavedSet(
        user.id,
        entries.map((e) => e.word_id),
      );
    }

    const needle = q?.toLowerCase() ?? "";
    const filtered: SavedListEntry[] = needle
      ? entries.filter((e) => e.word.toLowerCase().includes(needle))
      : entries;

    const slice = filtered.slice(offset, offset + limit);
    const items = slice.map((e) => ({
      id: e.id,
      word_id: e.word_id,
      word: e.word,
      pos: e.pos,
      meaning: e.meaning,
      ipa_uk: e.ipa_uk,
      ipa_us: e.ipa_us,
      created_at: e.created_at,
    }));
    const nextOffset = items.length === limit ? offset + items.length : null;
    return NextResponse.json({ items, nextOffset });
  } catch (cacheErr) {
    console.error("[cache:saved-list] read path failed, falling back to DB", cacheErr);
  }

  // ── Fallback DB path (identical to the pre-cache behavior) ────────────────
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
