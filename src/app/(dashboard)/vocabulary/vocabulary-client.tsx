"use client";

import { useRef, useState } from "react";
import { SavedWordsList } from "./saved-words-list";
import { VocabularySearch } from "./vocabulary-search";
import type { SavedWordItem } from "./types";

export function VocabularyClient() {
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [viewedWord, setViewedWord] = useState<SavedWordItem | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  function handleViewDetails(item: SavedWordItem) {
    setViewedWord(item);
    setActiveWord(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-8">
      <div ref={topRef}>
        <VocabularySearch
          onSearch={(w) => { setActiveWord(w); setViewedWord(null); }}
          activeWord={activeWord}
          externalSaved={viewedWord}
          onClearExternalSaved={() => setViewedWord(null)}
        />
      </div>
      <SavedWordsList onViewDetails={handleViewDetails} />
    </div>
  );
}
