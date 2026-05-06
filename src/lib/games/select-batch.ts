import type { SupabaseClient } from "@supabase/supabase-js";
import { pickDistractors } from "./distractors";
import type { BatchItem } from "./types";

export type { BatchItem };

type UserWordRow = {
  word_id: string;
  words: {
    word: string;
    meaning: string | null;
    ipa_uk: string | null;
    ipa_us: string | null;
    example: string | null;
  };
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

async function fetchUserWords(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserWordRow[]> {
  const { data, error } = await supabase
    .from("user_words")
    .select("word_id, words!inner(word, meaning, ipa_uk, ipa_us, example)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as UserWordRow[];
}

export async function selectForSpell(
  supabase: SupabaseClient,
  userId: string,
  size: number,
): Promise<BatchItem[]> {
  const rows = await fetchUserWords(supabase, userId);
  return shuffle(rows).slice(0, size).map((r) => ({
    word_id: r.word_id,
    word: r.words.word,
    meaning: r.words.meaning,
    example: r.words.example,
    ipa_uk: r.words.ipa_uk,
    ipa_us: r.words.ipa_us,
  }));
}

export async function selectForSentence(
  supabase: SupabaseClient,
  userId: string,
  size: number,
): Promise<BatchItem[]> {
  const rows = await fetchUserWords(supabase, userId);
  const eligible = rows.filter((r) => r.words.example !== null);
  return shuffle(eligible).slice(0, size).map((r) => ({
    word_id: r.word_id,
    word: r.words.word,
    meaning: r.words.meaning,
    example: r.words.example,
    ipa_uk: r.words.ipa_uk,
    ipa_us: r.words.ipa_us,
  }));
}

export async function selectForQuiz(
  supabase: SupabaseClient,
  userId: string,
  size: number,
): Promise<BatchItem[]> {
  const rows = await fetchUserWords(supabase, userId);
  const eligible = rows.filter((r) => r.words.meaning !== null);
  const candidates = shuffle(eligible).slice(0, size);
  const meaningPool = eligible.map((r) => r.words.meaning as string);

  return Promise.all(
    candidates.map(async (r) => {
      const otherMeanings = meaningPool.filter((m) => m !== r.words.meaning);
      const distractors = await pickDistractors(
        supabase,
        r.word_id,
        3,
        "meaning",
        otherMeanings,
      );
      return {
        word_id: r.word_id,
        word: r.words.word,
        meaning: r.words.meaning,
        example: r.words.example,
        ipa_uk: r.words.ipa_uk,
        ipa_us: r.words.ipa_us,
        distractors,
      };
    }),
  );
}

export async function selectForSynonym(
  supabase: SupabaseClient,
  userId: string,
  size: number,
  mode: "synonym" | "antonym" = "synonym",
): Promise<BatchItem[]> {
  const rows = await fetchUserWords(supabase, userId);
  const wordIds = rows.map((r) => r.word_id);
  if (wordIds.length === 0) return [];

  const { data: relations, error } = await supabase
    .from("word_relations")
    .select("word_id, related_text")
    .in("word_id", wordIds)
    .eq("relation_type", mode);
  if (error) throw error;

  const relMap = new Map<string, string[]>();
  for (const rel of (relations ?? []) as { word_id: string; related_text: string }[]) {
    if (!relMap.has(rel.word_id)) relMap.set(rel.word_id, []);
    relMap.get(rel.word_id)!.push(rel.related_text);
  }

  const eligible = rows.filter((r) => relMap.has(r.word_id));
  const candidates = shuffle(eligible).slice(0, size);
  const wordPool = rows.map((r) => r.words.word);

  return Promise.all(
    candidates.map(async (r) => {
      const synonyms = relMap.get(r.word_id)!;
      const correctSynonym = synonyms[Math.floor(Math.random() * synonyms.length)];
      const otherWords = wordPool.filter(
        (w) => w !== r.words.word && w !== correctSynonym,
      );
      const distractors = await pickDistractors(
        supabase,
        r.word_id,
        3,
        "word",
        otherWords,
      );
      return {
        word_id: r.word_id,
        word: r.words.word,
        meaning: r.words.meaning,
        example: r.words.example,
        ipa_uk: r.words.ipa_uk,
        ipa_us: r.words.ipa_us,
        correct_synonym: correctSynonym,
        distractors,
      };
    }),
  );
}
