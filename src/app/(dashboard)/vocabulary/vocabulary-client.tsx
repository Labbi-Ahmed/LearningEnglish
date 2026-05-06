"use client";

import { useState } from "react";
import { SavedWordsList } from "./saved-words-list";
import { VocabularySearch } from "./vocabulary-search";

export function VocabularyClient() {
  const [activeWord, setActiveWord] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <VocabularySearch onSearch={setActiveWord} activeWord={activeWord} />
      <SavedWordsList />
    </div>
  );
}
