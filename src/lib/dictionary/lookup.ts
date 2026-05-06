import { z } from "zod";

export class WordNotFoundError extends Error {
  constructor(word: string) {
    super(`Word not found: ${word}`);
    this.name = "WordNotFoundError";
  }
}
export class DictionaryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DictionaryParseError";
  }
}
export class DictionaryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DictionaryUnavailableError";
  }
}

const PhoneticSchema = z.object({
  text: z.string().optional(),
  audio: z.string().optional(),
});
const DefinitionSchema = z.object({
  definition: z.string(),
  example: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
});
const MeaningSchema = z.object({
  partOfSpeech: z.string(),
  definitions: z.array(DefinitionSchema),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
});
const EntrySchema = z.object({
  word: z.string(),
  phonetics: z.array(PhoneticSchema).optional(),
  meanings: z.array(MeaningSchema),
});
const UpstreamSchema = z.array(EntrySchema).min(1);

export interface NormalizedWord {
  word: string;
  pos: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  meaning: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
}

function pickIpa(
  phonetics: { text?: string; audio?: string }[] | undefined,
  region: "uk" | "us",
): string | null {
  if (!phonetics) return null;
  const tag = region === "uk" ? "-uk." : "-us.";
  const tagged = phonetics.find((p) => p.audio?.includes(tag) && p.text);
  if (tagged?.text) return tagged.text;
  const anyText = phonetics.find((p) => p.text);
  return anyText?.text ?? null;
}

function dedupeLower(values: string[]): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim().toLowerCase();
    if (t) seen.add(t);
  }
  return Array.from(seen);
}

export async function lookupWord(rawWord: string): Promise<NormalizedWord> {
  const word = rawWord.trim().toLowerCase();
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 0 } } as RequestInit);
  } catch (err) {
    throw new DictionaryUnavailableError(
      `Network error fetching ${word}: ${(err as Error).message}`,
    );
  }

  if (res.status === 404) throw new WordNotFoundError(word);
  if (!res.ok) {
    throw new DictionaryUnavailableError(`Upstream ${res.status} for ${word}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new DictionaryParseError(`Bad JSON for ${word}: ${(err as Error).message}`);
  }

  const parsed = UpstreamSchema.safeParse(json);
  if (!parsed.success) {
    throw new DictionaryParseError(`Schema mismatch for ${word}: ${parsed.error.message}`);
  }

  const entry = parsed.data[0]!;
  const firstMeaning = entry.meanings[0];
  const firstDef = firstMeaning?.definitions[0];

  const synonyms: string[] = [];
  const antonyms: string[] = [];
  for (const m of entry.meanings) {
    if (m.synonyms) synonyms.push(...m.synonyms);
    if (m.antonyms) antonyms.push(...m.antonyms);
    for (const d of m.definitions) {
      if (d.synonyms) synonyms.push(...d.synonyms);
      if (d.antonyms) antonyms.push(...d.antonyms);
    }
  }

  return {
    word,
    pos: firstMeaning?.partOfSpeech ?? null,
    ipa_uk: pickIpa(entry.phonetics, "uk"),
    ipa_us: pickIpa(entry.phonetics, "us"),
    meaning: firstDef?.definition ?? null,
    example: firstDef?.example ?? null,
    synonyms: dedupeLower(synonyms),
    antonyms: dedupeLower(antonyms),
  };
}
