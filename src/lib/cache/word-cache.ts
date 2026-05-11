import "server-only";

import type { CachedWord } from "@/lib/dictionary";
import { wordKey } from "./keys";
import { safeGet, safeSet } from "./redis";

const WORD_TTL_SECONDS = 24 * 60 * 60;

export async function getWordFromCache(
  slug: string,
): Promise<CachedWord | null> {
  return safeGet<CachedWord>(wordKey(slug));
}

export async function putWordInCache(
  slug: string,
  value: CachedWord,
): Promise<void> {
  await safeSet(wordKey(slug), value, WORD_TTL_SECONDS);
}
