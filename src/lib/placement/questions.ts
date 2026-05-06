import type { CefrLevel } from "@/lib/schemas/placement";

export type PlacementQuestion = {
  id: string;
  kind: "vocab" | "grammar" | "listening" | "reading";
  level: CefrLevel;
  prompt: string;
  options: string[];
  answer: string;
  // For listening: when TTS is unavailable, fall back to plain text.
  tts_text?: string;
  passage?: string;
};

// 13-question hand-curated bank: 4 vocab (a1/a2), 4 grammar (b1/b2),
// 3 listening (TTS prompt → choose meaning), 2 reading-comprehension.
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // ── Vocab a1/a2 ──────────────────────────────────────────────────
  {
    id: "v1",
    kind: "vocab",
    level: "a1",
    prompt: "Choose the word that means 'a place where you sleep'.",
    options: ["kitchen", "bedroom", "garden", "office"],
    answer: "bedroom",
  },
  {
    id: "v2",
    kind: "vocab",
    level: "a1",
    prompt: "Which word is a vegetable?",
    options: ["banana", "carrot", "salmon", "biscuit"],
    answer: "carrot",
  },
  {
    id: "v3",
    kind: "vocab",
    level: "a2",
    prompt: "What is the opposite of 'expensive'?",
    options: ["cheap", "costly", "fancy", "rich"],
    answer: "cheap",
  },
  {
    id: "v4",
    kind: "vocab",
    level: "a2",
    prompt: "If something is 'fragile', it is…",
    options: ["heavy", "easily broken", "loud", "delicious"],
    answer: "easily broken",
  },

  // ── Grammar b1/b2 ────────────────────────────────────────────────
  {
    id: "g1",
    kind: "grammar",
    level: "b1",
    prompt: "I __ in London since 2019.",
    options: ["live", "have lived", "lived", "am living"],
    answer: "have lived",
  },
  {
    id: "g2",
    kind: "grammar",
    level: "b1",
    prompt: "If I __ more time, I would learn another language.",
    options: ["have", "had", "will have", "would have"],
    answer: "had",
  },
  {
    id: "g3",
    kind: "grammar",
    level: "b2",
    prompt: "By the time we arrived, the film __ already.",
    options: ["started", "had started", "has started", "was starting"],
    answer: "had started",
  },
  {
    id: "g4",
    kind: "grammar",
    level: "b2",
    prompt: "The report __ by tomorrow morning.",
    options: [
      "will finish",
      "will have been finished",
      "is finishing",
      "finishes",
    ],
    answer: "will have been finished",
  },

  // ── Listening (TTS) ──────────────────────────────────────────────
  {
    id: "l1",
    kind: "listening",
    level: "a2",
    prompt: "Listen and choose what you heard.",
    tts_text: "I usually have breakfast at seven o'clock.",
    options: [
      "I usually have breakfast at seven o'clock.",
      "I usually have dinner at seven o'clock.",
      "I sometimes have breakfast at eleven o'clock.",
      "I rarely have breakfast at seven.",
    ],
    answer: "I usually have breakfast at seven o'clock.",
  },
  {
    id: "l2",
    kind: "listening",
    level: "b1",
    prompt: "Listen and pick the speaker's meaning.",
    tts_text:
      "I would have helped you, but I didn't know you were here.",
    options: [
      "The speaker helped.",
      "The speaker did not help because they didn't know.",
      "The speaker refused to help.",
      "The speaker is offering help now.",
    ],
    answer: "The speaker did not help because they didn't know.",
  },
  {
    id: "l3",
    kind: "listening",
    level: "b2",
    prompt: "Listen — what is the speaker doing?",
    tts_text:
      "Had I realised the deadline was today, I would have started earlier.",
    options: [
      "Expressing regret about the past.",
      "Asking a question.",
      "Making a promise.",
      "Giving an instruction.",
    ],
    answer: "Expressing regret about the past.",
  },

  // ── Reading comprehension ────────────────────────────────────────
  {
    id: "r1",
    kind: "reading",
    level: "b1",
    passage:
      "Lina cycles to work every morning. The trip takes about twenty minutes if the weather is good. When it rains, she takes the bus instead, but she finds that journey boring.",
    prompt: "How does Lina usually get to work?",
    options: ["By bus", "By car", "By bicycle", "On foot"],
    answer: "By bicycle",
  },
  {
    id: "r2",
    kind: "reading",
    level: "b2",
    passage:
      "Despite the company's record profits this quarter, executives have warned that growth will likely slow next year as input costs rise and consumer demand softens.",
    prompt: "What is the executives' outlook for next year?",
    options: [
      "Stronger growth than this year",
      "Continued record profits",
      "Slower growth due to costs and demand",
      "Bankruptcy",
    ],
    answer: "Slower growth due to costs and demand",
  },
];

export const PLACEMENT_QUESTION_MAP: Record<string, PlacementQuestion> =
  Object.fromEntries(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
