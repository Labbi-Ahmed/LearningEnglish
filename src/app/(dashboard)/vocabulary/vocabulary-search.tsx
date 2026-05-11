"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { speak } from "@/lib/speech";
import type { SavedWordItem } from "./types";

interface LookupResponse {
  word: string;
  word_id: string;
  pos: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  meaning: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
  meaning_bn: string | null;
  example_bn: string | null;
  synonyms_bn: string[];
  antonyms_bn: string[];
  saved?: boolean;
}

interface SavedListResponse {
  items: SavedWordItem[];
  nextOffset: number | null;
}

async function fetchWord(slug: string): Promise<LookupResponse> {
  const res = await fetch(`/api/words/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error("word_not_found");
  if (!res.ok) throw new Error("lookup_unavailable");
  return res.json();
}

async function fetchSavedSuggestions(q: string): Promise<SavedWordItem[]> {
  const res = await fetch(`/api/words?q=${encodeURIComponent(q)}&limit=8`);
  if (!res.ok) throw new Error("suggest_failed");
  const body = (await res.json()) as SavedListResponse;
  return body.items;
}

function savedToLookup(item: SavedWordItem): LookupResponse {
  return {
    word: item.word,
    word_id: item.word_id,
    pos: item.pos,
    ipa_uk: item.ipa_uk,
    ipa_us: item.ipa_us,
    meaning: item.meaning,
    example: null,
    synonyms: [],
    antonyms: [],
    meaning_bn: null,
    example_bn: null,
    synonyms_bn: [],
    antonyms_bn: [],
  };
}

export function VocabularySearch({
  activeWord,
  onSearch,
  externalSaved,
  onClearExternalSaved,
}: {
  activeWord: string | null;
  onSearch: (w: string | null) => void;
  externalSaved?: SavedWordItem | null;
  onClearExternalSaved?: () => void;
}) {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [selectedSaved, setSelectedSaved] = useState<SavedWordItem | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 200);
    return () => clearTimeout(t);
  }, [input]);

  const suggestions = useQuery<SavedWordItem[], Error>({
    queryKey: ["saved-suggestions", debounced.toLowerCase()],
    queryFn: () => fetchSavedSuggestions(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const items = useMemo(() => suggestions.data ?? [], [suggestions.data]);

  useEffect(() => {
    setHighlight(-1);
  }, [items.length, debounced]);

  const displaySaved = externalSaved ?? selectedSaved;

  const lookup = useQuery<LookupResponse, Error>({
    queryKey: ["word", activeWord],
    queryFn: () => fetchWord(activeWord as string),
    enabled: Boolean(activeWord) && !selectedSaved && !externalSaved,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const exactSavedMatch = useMemo(() => {
    const needle = input.trim().toLowerCase();
    if (!needle) return null;
    return items.find((i) => i.word.toLowerCase() === needle) ?? null;
  }, [input, items]);

  const pickSaved = (item: SavedWordItem) => {
    setSelectedSaved(item);
    setInput(item.word);
    setOpen(false);
    setHighlight(-1);
    onSearch(null);
  };

  const submit = () => {
    const next = input.trim().toLowerCase();
    if (!next) return;
    onClearExternalSaved?.();
    if (highlight >= 0 && items[highlight]) {
      pickSaved(items[highlight]);
      return;
    }
    if (exactSavedMatch) {
      pickSaved(exactSavedMatch);
      return;
    }
    setSelectedSaved(null);
    setOpen(false);
    onSearch(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const showDropdown = open && debounced.length >= 2 && !selectedSaved;

  return (
    <div className="space-y-4">
      <form
        className="relative flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
              if (selectedSaved) setSelectedSaved(null);
              if (externalSaved) onClearExternalSaved?.();
              if (activeWord) onSearch(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a word, e.g. serendipity"
            autoFocus
            autoComplete="off"
          />

          {showDropdown && (
            <div
              role="listbox"
              className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg max-h-72 overflow-auto"
            >
              {suggestions.isFetching && items.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Searching saved words…</span>
                </div>
              ) : items.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No matches in your saved words. Press Enter to look it up.
                </div>
              ) : (
                <ul>
                  {items.map((item, i) => (
                    <li
                      key={item.id}
                      role="option"
                      aria-selected={i === highlight}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickSaved(item);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        i === highlight ? "bg-accent" : "hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{item.word}</span>
                        {item.pos && (
                          <span className="text-xs text-muted-foreground">{item.pos}</span>
                        )}
                      </div>
                      {item.meaning && (
                        <p className="truncate text-xs text-muted-foreground">{item.meaning}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <Button type="submit">Look up</Button>
      </form>

      {!displaySaved && lookup.isFetching && (
        <p className="text-sm text-muted-foreground">Looking up…</p>
      )}
      {!displaySaved && lookup.isError && lookup.error.message === "word_not_found" && (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find that word — check the spelling.
        </p>
      )}
      {!displaySaved && lookup.isError && lookup.error.message !== "word_not_found" && (
        <p className="text-sm text-destructive">
          The dictionary is unavailable right now. Please try again in a moment.
        </p>
      )}

      {displaySaved ? (
        <WordCard key={`saved-${displaySaved.id}`} word={savedToLookup(displaySaved)} alreadySaved />
      ) : (
        lookup.data && (
          <WordCard key={lookup.data.word} word={lookup.data} alreadySaved={lookup.data.saved === true} />
        )
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-label="Loading"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
    />
  );
}

function WordCard({
  word,
  alreadySaved = false,
}: {
  word: LookupResponse;
  alreadySaved?: boolean;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"idle" | "saved" | "already" | "error">(
    alreadySaved ? "already" : "idle",
  );
  const [lang, setLang] = useState<"en" | "bn">("en");

  const hasBn = Boolean(word.meaning_bn);

  const displayMeaning  = lang === "bn" && word.meaning_bn  ? word.meaning_bn  : word.meaning;
  const displayExample  = lang === "bn" && word.example_bn  ? word.example_bn  : word.example;
  const displaySynonyms = lang === "bn" && word.synonyms_bn.length > 0 ? word.synonyms_bn : word.synonyms;
  const displayAntonyms = lang === "bn" && word.antonyms_bn.length > 0 ? word.antonyms_bn : word.antonyms;
  const meaningLabel    = lang === "bn" ? "অর্থ" : "Meaning";

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/words/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.word }),
      });
      if (!res.ok) throw new Error("save_failed");
      return res.json() as Promise<{ saved: boolean; already: boolean; word_id: string }>;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["saved-words"] });
      const previous = qc.getQueriesData<{ items: SavedWordItem[]; nextOffset: number | null }>({
        queryKey: ["saved-words"],
      });
      qc.setQueriesData<{ items: SavedWordItem[]; nextOffset: number | null }>(
        { queryKey: ["saved-words"] },
        (old) => {
          if (!old) return old;
          if (old.items.some((i) => i.word === word.word)) return old;
          const optimistic: SavedWordItem = {
            id: `optimistic-${word.word_id}`,
            word_id: word.word_id,
            word: word.word,
            pos: word.pos,
            meaning: word.meaning,
            ipa_uk: word.ipa_uk,
            ipa_us: word.ipa_us,
            created_at: new Date().toISOString(),
            optimistic: true,
          };
          return { ...old, items: [optimistic, ...old.items] };
        },
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      setStatus("error");
    },
    onSuccess: (data) => {
      setStatus(data.already ? "already" : "saved");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["saved-words"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-3">
          <span className="text-2xl">{word.word}</span>
          {word.pos && (
            <span className="text-sm font-normal text-muted-foreground">{word.pos}</span>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {word.ipa_uk && <span>UK {word.ipa_uk}</span>}
          {word.ipa_us && <span>US {word.ipa_us}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "uk")}>
            Play UK
          </Button>
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "us")}>
            Play US
          </Button>
          {status !== "saved" && status !== "already" && (
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save to my words"}
            </Button>
          )}
          {status === "saved" && (
            <span className="self-center text-sm text-muted-foreground">✓ Saved</span>
          )}
          {status === "already" && (
            <span className="self-center text-sm text-muted-foreground">Already in your bank</span>
          )}
          {status === "error" && (
            <span className="self-center text-sm text-destructive">Save failed — try again.</span>
          )}
        </div>

        {/* Language toggle — only when Bangla data is available */}
        {hasBn && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={lang === "en" ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => setLang("en")}
            >
              EN
            </Button>
            <Button
              size="sm"
              variant={lang === "bn" ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => setLang("bn")}
            >
              বাং
            </Button>
          </div>
        )}

        {/* Meaning */}
        {displayMeaning && (
          <p>
            <span className="font-medium">{meaningLabel}. </span>
            {displayMeaning}
          </p>
        )}

        {/* Example */}
        {displayExample && (
          <p className="italic text-muted-foreground">&ldquo;{displayExample}&rdquo;</p>
        )}

        {/* Synonyms */}
        {displaySynonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Synonyms: </span>
            {displaySynonyms.slice(0, 8).join(", ")}
          </p>
        )}

        {/* Antonyms */}
        {displayAntonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Antonyms: </span>
            {displayAntonyms.slice(0, 8).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
