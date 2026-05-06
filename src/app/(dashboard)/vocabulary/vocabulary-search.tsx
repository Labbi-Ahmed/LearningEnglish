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
  };
}

export function VocabularySearch({
  activeWord,
  onSearch,
}: {
  activeWord: string | null;
  onSearch: (w: string | null) => void;
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

  // Reset highlight when items change
  useEffect(() => {
    setHighlight(-1);
  }, [items.length, debounced]);

  const lookup = useQuery<LookupResponse, Error>({
    queryKey: ["word", activeWord],
    queryFn: () => fetchWord(activeWord as string),
    enabled: Boolean(activeWord) && !selectedSaved,
    retry: false,
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
    onSearch(null); // cancel any in-flight lookup card
  };

  const submit = () => {
    const next = input.trim().toLowerCase();
    if (!next) return;

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
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Allow click on suggestion to register first
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

      {!selectedSaved && lookup.isFetching && (
        <p className="text-sm text-muted-foreground">Looking up…</p>
      )}

      {!selectedSaved && lookup.isError && lookup.error.message === "word_not_found" && (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find that word — check the spelling.
        </p>
      )}
      {!selectedSaved && lookup.isError && lookup.error.message !== "word_not_found" && (
        <p className="text-sm text-destructive">
          The dictionary is unavailable right now. Please try again in a moment.
        </p>
      )}

      {selectedSaved ? (
        <WordCard
          key={`saved-${selectedSaved.id}`}
          word={savedToLookup(selectedSaved)}
          alreadySaved
        />
      ) : (
        lookup.data && <WordCard key={lookup.data.word} word={lookup.data} />
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "uk")}>
            Play UK
          </Button>
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "us")}>
            Play US
          </Button>
          {status !== "saved" && status !== "already" && (
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
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
        {word.meaning && (
          <p>
            <span className="font-medium">Meaning. </span>
            {word.meaning}
          </p>
        )}
        {word.example && (
          <p className="italic text-muted-foreground">&ldquo;{word.example}&rdquo;</p>
        )}
        {word.synonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Synonyms: </span>
            {word.synonyms.slice(0, 8).join(", ")}
          </p>
        )}
        {word.antonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Antonyms: </span>
            {word.antonyms.slice(0, 8).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
