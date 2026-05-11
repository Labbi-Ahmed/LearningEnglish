import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { savedListKey, savedSetKey } from "./keys";
import { safeDel, safeGet, safeSet } from "./redis";
import { hydrateSavedSet } from "./saved-set";

const LIST_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_ENTRIES = 5000;

export type SavedListEntry = {
  id: string;
  word_id: string;
  word: string;
  pos: string | null;
  meaning: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  created_at: string;
};

export async function getSavedListFromCache(
  userId: string,
): Promise<SavedListEntry[] | null> {
  return safeGet<SavedListEntry[]>(savedListKey(userId));
}

export async function putSavedListInCache(
  userId: string,
  entries: SavedListEntry[],
): Promise<void> {
  if (entries.length > MAX_ENTRIES) {
    console.warn(
      `[cache:saved-list] over-cap user=${userId} count=${entries.length} — skipping cache write`,
    );
    return;
  }
  await safeSet(savedListKey(userId), entries, LIST_TTL_SECONDS);
}

export async function invalidateSavedList(userId: string): Promise<void> {
  await safeDel(savedListKey(userId));
}

/**
 * Removes every per-user cache entry for the given user. Called on logout
 * to keep Redis tidy and avoid leaving entries on shared devices.
 */
export async function clearUserCaches(userId: string): Promise<void> {
  await Promise.all([
    safeDel(savedListKey(userId)),
    safeDel(savedSetKey(userId)),
  ]);
}

/**
 * Loads the user's full saved-word list from the DB and writes both the
 * per-user list cache and the saved-id set cache. Safe to fire-and-forget;
 * errors are logged but never thrown.
 */
export async function hydrateUserCachesAfterSignIn(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_words")
      .select("id, word_id, created_at, words!inner(word, pos, meaning, ipa_uk, ipa_us)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[cache:saved-list] hydrate db read", error);
      return;
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

    const rows = (data ?? []) as unknown as Row[];
    const entries: SavedListEntry[] = rows.map((r) => ({
      id: r.id,
      word_id: r.word_id,
      word: r.words.word,
      pos: r.words.pos,
      meaning: r.words.meaning,
      ipa_uk: r.words.ipa_uk,
      ipa_us: r.words.ipa_us,
      created_at: r.created_at,
    }));

    await putSavedListInCache(userId, entries);
    await hydrateSavedSet(
      userId,
      entries.map((e) => e.word_id),
    );
  } catch (err) {
    console.error("[cache:saved-list] hydrate unexpected", err);
  }
}
