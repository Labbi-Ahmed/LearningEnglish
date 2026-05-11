import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { translateTobn } from "@/lib/translate";
import {
  DictionaryUnavailableError,
  type NormalizedWord,
  lookupWord,
} from "@/lib/dictionary/lookup";
import { getWordFromCache, putWordInCache } from "@/lib/cache/word-cache";

export {
  WordNotFoundError,
  DictionaryParseError,
  DictionaryUnavailableError,
  lookupWord,
} from "@/lib/dictionary/lookup";
export type { NormalizedWord } from "@/lib/dictionary/lookup";

export interface CachedWord extends NormalizedWord {
  id: string;
  meaning_bn: string | null;
  example_bn: string | null;
  word_bn: string | null;
  synonyms_bn: string[];
  antonyms_bn: string[];
}

export async function upsertWordFromDictionary(rawWord: string): Promise<CachedWord> {
  const word = rawWord.trim().toLowerCase();

  // ── Redis cache short-circuit ─────────────────────────────────────────────
  const cached = await getWordFromCache(word);
  if (cached) return cached;

  const admin = createAdminClient();

  // ── Cache hit path ────────────────────────────────────────────────────────
  const { data: existing, error: readErr } = await admin
    .from("words")
    .select("id, word, pos, ipa_uk, ipa_us, meaning, example, meaning_bn, example_bn, word_bn")
    .eq("word", word)
    .maybeSingle();

  if (readErr) {
    throw new DictionaryUnavailableError(`DB read failed: ${readErr.message}`);
  }

  if (existing) {
    const { data: relations } = await admin
      .from("word_relations")
      .select("related_text, related_text_bn, relation_type")
      .eq("word_id", existing.id);

    const synonyms = (relations ?? [])
      .filter((r) => r.relation_type === "synonym")
      .map((r) => r.related_text as string);
    const antonyms = (relations ?? [])
      .filter((r) => r.relation_type === "antonym")
      .map((r) => r.related_text as string);
    const synonyms_bn = (relations ?? [])
      .filter((r) => r.relation_type === "synonym" && r.related_text_bn)
      .map((r) => r.related_text_bn as string);
    const antonyms_bn = (relations ?? [])
      .filter((r) => r.relation_type === "antonym" && r.related_text_bn)
      .map((r) => r.related_text_bn as string);

    const dbResult: CachedWord = {
      id: existing.id as string,
      word: existing.word as string,
      pos: (existing.pos as string | null) ?? null,
      ipa_uk: (existing.ipa_uk as string | null) ?? null,
      ipa_us: (existing.ipa_us as string | null) ?? null,
      meaning: (existing.meaning as string | null) ?? null,
      example: (existing.example as string | null) ?? null,
      meaning_bn: (existing.meaning_bn as string | null) ?? null,
      example_bn: (existing.example_bn as string | null) ?? null,
      word_bn: (existing.word_bn as string | null) ?? null,
      synonyms,
      antonyms,
      synonyms_bn,
      antonyms_bn,
    };
    await putWordInCache(word, dbResult);
    return dbResult;
  }

  // ── Cache miss path ───────────────────────────────────────────────────────
  const fresh = await lookupWord(word);

  const { data: inserted, error: insertErr } = await admin
    .from("words")
    .insert({
      word: fresh.word,
      pos: fresh.pos,
      ipa_uk: fresh.ipa_uk,
      ipa_us: fresh.ipa_us,
      meaning: fresh.meaning,
      example: fresh.example,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    throw new DictionaryUnavailableError(`Insert failed: ${insertErr?.message ?? "unknown"}`);
  }

  const wordId = inserted.id as string;

  // Build relation rows (English) first so we can upsert with bn in one pass
  const relationRows = [
    ...fresh.synonyms.map((t) => ({ word_id: wordId, related_text: t, relation_type: "synonym" as const })),
    ...fresh.antonyms.map((t) => ({ word_id: wordId, related_text: t, relation_type: "antonym" as const })),
  ];

  // Translate everything in parallel — non-fatal
  let meaning_bn: string | null = null;
  let example_bn: string | null = null;
  let word_bn: string | null = null;
  const relations_bn: (string | null)[] = [];

  try {
    const translateTargets: string[] = [
      fresh.meaning ?? "",
      fresh.example ?? "",
      fresh.word,
      ...relationRows.map((r) => r.related_text),
    ];

    const results = await Promise.all(translateTargets.map((t) => (t ? translateTobn(t) : Promise.resolve(null))));

    meaning_bn = results[0] ?? null;
    example_bn = results[1] ?? null;
    word_bn = results[2] ?? null;
    relations_bn.push(...results.slice(3));

    // Update words row with bn fields
    await admin
      .from("words")
      .update({ meaning_bn, example_bn, word_bn })
      .eq("id", wordId);
  } catch {
    // Translation block failed entirely — English data still returned below
  }

  // Upsert relations with bn translations
  if (relationRows.length > 0) {
    const rowsWithBn = relationRows.map((r, i) => ({
      ...r,
      related_text_bn: relations_bn[i] ?? null,
    }));
    const { error: relErr } = await admin
      .from("word_relations")
      .upsert(rowsWithBn, { onConflict: "word_id,related_text,relation_type" });
    if (relErr) {
      console.error("word_relations insert failed", relErr);
    }
  }

  const freshResult: CachedWord = {
    id: wordId,
    ...fresh,
    meaning_bn,
    example_bn,
    word_bn,
    synonyms_bn: relations_bn
      .slice(0, fresh.synonyms.length)
      .filter((v): v is string => v !== null),
    antonyms_bn: relations_bn
      .slice(fresh.synonyms.length)
      .filter((v): v is string => v !== null),
  };
  await putWordInCache(word, freshResult);
  return freshResult;
}
