import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { putSavedListInCache, type SavedListEntry } from "./saved-list";
import { hydrateSavedSet } from "./saved-set";

const BATCH_SIZE = 50;
const ACTIVE_WINDOW_DAYS = 14;

type UserWordRow = {
  id: string;
  word_id: string;
  user_id: string;
  created_at: string;
  words: {
    word: string;
    pos: string | null;
    meaning: string | null;
    ipa_uk: string | null;
    ipa_us: string | null;
  };
};

export async function warmActiveUserCaches(): Promise<{ refreshed: number; batches: number }> {
  const admin = createAdminClient();

  const sinceIso = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD — last_active_date is a date column

  const { data: activeProfiles, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .gte("last_active_date", sinceIso)
    .order("id", { ascending: true });
  if (profileError) {
    throw new Error(`profiles select failed: ${profileError.message}`);
  }

  const userIds = ((activeProfiles ?? []) as { id: string }[]).map((p) => p.id);
  let refreshed = 0;
  let batches = 0;

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batchIds = userIds.slice(i, i + BATCH_SIZE);
    const { data: rows, error } = await admin
      .from("user_words")
      .select("id, word_id, user_id, created_at, words!inner(word, pos, meaning, ipa_uk, ipa_us)")
      .in("user_id", batchIds)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[cache:saved-list] warm-users batch failed", error);
      continue;
    }

    const byUser = new Map<string, SavedListEntry[]>();
    for (const id of batchIds) byUser.set(id, []);
    for (const r of (rows ?? []) as unknown as UserWordRow[]) {
      const list = byUser.get(r.user_id);
      if (!list) continue;
      list.push({
        id: r.id,
        word_id: r.word_id,
        word: r.words.word,
        pos: r.words.pos,
        meaning: r.words.meaning,
        ipa_uk: r.words.ipa_uk,
        ipa_us: r.words.ipa_us,
        created_at: r.created_at,
      });
    }

    for (const [userId, entries] of byUser) {
      await putSavedListInCache(userId, entries);
      await hydrateSavedSet(
        userId,
        entries.map((e) => e.word_id),
      );
      refreshed++;
    }

    batches++;
  }

  return { refreshed, batches };
}
