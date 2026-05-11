import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CachedWord } from "@/lib/dictionary";
import { putWordInCache } from "./word-cache";

const BATCH_SIZE = 500;

type WordRow = {
  id: string;
  word: string;
  pos: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  meaning: string | null;
  example: string | null;
  meaning_bn: string | null;
  example_bn: string | null;
  word_bn: string | null;
};

type RelationRow = {
  word_id: string;
  related_text: string;
  related_text_bn: string | null;
  relation_type: string;
};

export async function warmWordCache(): Promise<{ warmed: number; batches: number }> {
  const admin = createAdminClient();
  let warmed = 0;
  let batches = 0;

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data: rows, error } = await admin
      .from("words")
      .select(
        "id, word, pos, ipa_uk, ipa_us, meaning, example, meaning_bn, example_bn, word_bn",
      )
      .order("id", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (error) throw new Error(`words select failed: ${error.message}`);
    const batch = (rows ?? []) as WordRow[];
    if (batch.length === 0) break;

    const ids = batch.map((r) => r.id);
    const { data: relRows, error: relErr } = await admin
      .from("word_relations")
      .select("word_id, related_text, related_text_bn, relation_type")
      .in("word_id", ids);
    if (relErr) throw new Error(`word_relations select failed: ${relErr.message}`);

    const relationsByWord = new Map<string, RelationRow[]>();
    for (const r of (relRows ?? []) as RelationRow[]) {
      const list = relationsByWord.get(r.word_id) ?? [];
      list.push(r);
      relationsByWord.set(r.word_id, list);
    }

    for (const row of batch) {
      const rels = relationsByWord.get(row.id) ?? [];
      const synonyms = rels.filter((r) => r.relation_type === "synonym").map((r) => r.related_text);
      const antonyms = rels.filter((r) => r.relation_type === "antonym").map((r) => r.related_text);
      const synonyms_bn = rels
        .filter((r) => r.relation_type === "synonym" && r.related_text_bn)
        .map((r) => r.related_text_bn as string);
      const antonyms_bn = rels
        .filter((r) => r.relation_type === "antonym" && r.related_text_bn)
        .map((r) => r.related_text_bn as string);

      const value: CachedWord = {
        id: row.id,
        word: row.word,
        pos: row.pos,
        ipa_uk: row.ipa_uk,
        ipa_us: row.ipa_us,
        meaning: row.meaning,
        example: row.example,
        meaning_bn: row.meaning_bn,
        example_bn: row.example_bn,
        word_bn: row.word_bn,
        synonyms,
        antonyms,
        synonyms_bn,
        antonyms_bn,
      };
      await putWordInCache(row.word, value);
      warmed++;
    }

    batches++;
    if (batch.length < BATCH_SIZE) break;
  }

  return { warmed, batches };
}
