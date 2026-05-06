export type BatchItem = {
  word_id: string;
  word: string;
  meaning: string | null;
  example: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  distractors?: string[];
  correct_synonym?: string;
};

export type GameResultItem = { word_id: string; correct: boolean };

export type GameSubmitPayload = {
  score: number;
  total: number;
  duration_ms: number;
  items: GameResultItem[];
};
