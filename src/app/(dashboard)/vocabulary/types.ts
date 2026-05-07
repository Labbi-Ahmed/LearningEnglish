export interface SavedWordItem {
  id: string;
  word_id: string;
  word: string;
  pos: string | null;
  meaning: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  created_at: string;
  optimistic?: boolean;
}
