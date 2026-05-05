import { VocabularyClient } from "./vocabulary-client";

export default function VocabularyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vocabulary</h1>
        <p className="text-sm text-muted-foreground">
          Look up an English word, hear its pronunciation, and save it to your bank.
        </p>
      </div>
      <VocabularyClient />
    </div>
  );
}
