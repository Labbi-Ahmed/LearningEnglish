import "server-only";

import { savedSetKey } from "./keys";
import {
  safeExists,
  safeExpire,
  safeSadd,
  safeSaddMany,
  safeSismember,
  safeSrem,
} from "./redis";

const SAVED_SET_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Returns `true`/`false` when the set is hydrated, or `null` when the
 * set does not exist yet (caller should fall back to DB and hydrate).
 */
export async function isWordSavedCached(
  userId: string,
  wordId: string,
): Promise<boolean | null> {
  const key = savedSetKey(userId);
  const exists = await safeExists(key);
  if (exists !== true) return null;
  return safeSismember(key, wordId);
}

export async function addToSavedCache(
  userId: string,
  wordId: string,
): Promise<void> {
  const key = savedSetKey(userId);
  await safeSadd(key, wordId);
  await safeExpire(key, SAVED_SET_TTL_SECONDS);
}

export async function removeFromSavedCache(
  userId: string,
  wordId: string,
): Promise<void> {
  await safeSrem(savedSetKey(userId), wordId);
}

export async function hydrateSavedSet(
  userId: string,
  wordIds: readonly string[],
): Promise<void> {
  const key = savedSetKey(userId);
  if (wordIds.length > 0) {
    await safeSaddMany(key, wordIds);
  }
  await safeExpire(key, SAVED_SET_TTL_SECONDS);
}
