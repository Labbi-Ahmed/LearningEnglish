import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DictionaryUnavailableError,
  type NormalizedWord,
  lookupWord,
} from "@/lib/dictionary/lookup";

export {
  WordNotFoundError,
  DictionaryParseError,
  DictionaryUnavailableError,
  lookupWord,
} from "@/lib/dictionary/lookup";
export type { NormalizedWord } from "@/lib/dictionary/lookup";

export interface CachedWord extends NormalizedWord {
  id: string;
}

export async function upsertWordFromDictionary(rawWord: string): Promise<CachedWord> {
  const word = rawWord.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: existing, error: readErr } = await admin
    .from("words")
    .select("id, word, pos, ipa_uk, ipa_us, meaning, example")
    .eq("word", word)
    .maybeSingle();

  if (readErr) {
    throw new DictionaryUnavailableError(`DB read failed: ${readErr.message}`);
  }

  if (existing) {
    const { data: relations } = await admin
      .from("word_relations")
      .select("related_text, relation_type")
      .eq("word_id", existing.id);

    const synonyms = (relations ?? [])
      .filter((r) => r.relation_type === "synonym")
      .map((r) => r.related_text as string);
    const antonyms = (relations ?? [])
      .filter((r) => r.relation_type === "antonym")
      .map((r) => r.related_text as string);

    return {
      id: existing.id as string,
      word: existing.word as string,
      pos: (existing.pos as string | null) ?? null,
      ipa_uk: (existing.ipa_uk as string | null) ?? null,
      ipa_us: (existing.ipa_us as string | null) ?? null,
      meaning: (existing.meaning as string | null) ?? null,
      example: (existing.example as string | null) ?? null,
      synonyms,
      antonyms,
    };
  }

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

  const relationRows = [
    ...fresh.synonyms.map((t) => ({
      word_id: wordId,
      related_text: t,
      relation_type: "synonym" as const,
    })),
    ...fresh.antonyms.map((t) => ({
      word_id: wordId,
      related_text: t,
      relation_type: "antonym" as const,
    })),
  ];

  if (relationRows.length > 0) {
    const { error: relErr } = await admin
      .from("word_relations")
      .upsert(relationRows, { onConflict: "word_id,related_text,relation_type" });
    if (relErr) {
      console.error("word_relations insert failed", relErr);
    }
  }

  return { id: wordId, ...fresh };
}
