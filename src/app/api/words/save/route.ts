import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SaveWordBodySchema, WordSlugSchema } from "@/lib/schemas/words";
import {
  DictionaryParseError,
  DictionaryUnavailableError,
  WordNotFoundError,
  upsertWordFromDictionary,
} from "@/lib/dictionary";
import { assertWithinQuota } from "@/lib/quotas/enforce";
import { QuotaExceededError } from "@/lib/quotas/errors";
import { addToSavedCache } from "@/lib/cache/saved-set";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsedBody = SaveWordBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const slug = parsedBody.data.word.toLowerCase();
  const parsedSlug = WordSlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
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
    await assertWithinQuota(supabase, user.id, "word_save");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(err.toResponseBody(), { status: 429 });
    }
    return NextResponse.json({ error: "quota_check_failed" }, { status: 500 });
  }

  let wordId: string;
  try {
    const cached = await upsertWordFromDictionary(parsedSlug.data);
    wordId = cached.id;
  } catch (err) {
    if (err instanceof WordNotFoundError) {
      return NextResponse.json({ error: "word_not_found" }, { status: 404 });
    }
    if (err instanceof DictionaryUnavailableError || err instanceof DictionaryParseError) {
      console.error("save lookup failed", err);
      return NextResponse.json({ error: "lookup_unavailable" }, { status: 502 });
    }
    console.error("unexpected save error", err);
    return NextResponse.json({ error: "lookup_unavailable" }, { status: 502 });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("user_words")
    .upsert(
      { user_id: user.id, word_id: wordId },
      { onConflict: "user_id,word_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (insertErr) {
    console.error("user_words insert failed", insertErr);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const already = inserted === null;
  await addToSavedCache(user.id, wordId);
  return NextResponse.json({ saved: true, already, word_id: wordId });
}
