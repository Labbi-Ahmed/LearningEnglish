import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WordIdParamSchema, WordSlugSchema } from "@/lib/schemas/words";
import {
  DictionaryParseError,
  DictionaryUnavailableError,
  WordNotFoundError,
  upsertWordFromDictionary,
} from "@/lib/dictionary";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  context: { params: Promise<{ word: string }> },
) {
  const { word: rawParam } = await context.params;
  const slug = decodeURIComponent(rawParam ?? "").toLowerCase();

  if (UUID_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const parsed = WordSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const cached = await upsertWordFromDictionary(parsed.data);

    const { count } = await supabase
      .from("user_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("word_id", cached.id);

    return NextResponse.json({
      word: cached.word,
      pos: cached.pos,
      ipa_uk: cached.ipa_uk,
      ipa_us: cached.ipa_us,
      meaning: cached.meaning,
      example: cached.example,
      synonyms: cached.synonyms,
      antonyms: cached.antonyms,
      meaning_bn: cached.meaning_bn,
      example_bn: cached.example_bn,
      synonyms_bn: cached.synonyms_bn,
      antonyms_bn: cached.antonyms_bn,
      word_id: cached.id,
      saved: (count ?? 0) > 0,
    });
  } catch (err) {
    if (err instanceof WordNotFoundError) {
      return NextResponse.json({ error: "word_not_found" }, { status: 404 });
    }
    if (err instanceof DictionaryUnavailableError || err instanceof DictionaryParseError) {
      console.error("dictionary lookup failed", err);
      return NextResponse.json({ error: "lookup_unavailable" }, { status: 502 });
    }
    console.error("unexpected lookup error", err);
    return NextResponse.json({ error: "lookup_unavailable" }, { status: 502 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ word: string }> },
) {
  const { word: rawParam } = await context.params;
  const parsed = WordIdParamSchema.safeParse(rawParam);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("user_words").delete().eq("id", parsed.data);
  if (error) {
    console.error("user_words delete failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
