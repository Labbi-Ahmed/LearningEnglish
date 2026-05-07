import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { env } from "@/lib/env";

export class AIQuotaError extends Error {
  constructor() { super("ai_quota"); this.name = "AIQuotaError"; }
}
export class AIUnavailableError extends Error {
  constructor() { super("ai_unavailable"); this.name = "AIUnavailableError"; }
}
export class AIParseError extends Error {
  constructor(msg: string) { super(msg); this.name = "AIParseError"; }
}

function getClient() {
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

function mapError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.toLowerCase().includes("quota")) throw new AIQuotaError();
  throw new AIUnavailableError();
}

const SYSTEM_CHAT = `You are a friendly English tutor helping a learner improve their conversational English. Keep replies concise (2-4 sentences). Correct grammar gently when needed.`;

const SYSTEM_FEEDBACK = `You are an English writing coach. Analyze the text and return ONLY valid JSON matching exactly:
{"corrected":"<full corrected text>","issues":[{"excerpt":"<original phrase>","suggestion":"<corrected phrase>","category":"grammar"|"spelling"|"style"|"clarity"}]}
Limit to the most important 5 issues. Return an empty issues array if the text has no errors.`;

const SYSTEM_REPHRASE = `You are a writing assistant. Rephrase the given sentence in exactly the requested style. Return ONLY valid JSON: {"alternates":["<option1>","<option2>","<option3>"]}. Provide exactly 3 alternatives.`;

export async function generateChat(
  messages: { role: "user" | "model"; content: string }[],
): Promise<string> {
  try {
    const ai = getClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const history: Content[] = messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));
    const last = messages[messages.length - 1];
    if (!last) throw new AIUnavailableError();
    const chat = model.startChat({
      history,
      systemInstruction: { role: "user", parts: [{ text: SYSTEM_CHAT }] },
    });
    const result = await chat.sendMessage(last.content);
    return result.response.text();
  } catch (err) {
    if (err instanceof AIQuotaError || err instanceof AIUnavailableError) throw err;
    mapError(err);
  }
}

export async function generateWritingFeedback(text: string): Promise<{
  corrected: string;
  issues: { excerpt: string; suggestion: string; category: string }[];
}> {
  try {
    const ai = getClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_FEEDBACK,
    });
    const result = await model.generateContent(text);
    const raw = result.response.text().trim();
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(json) as { corrected: string; issues: unknown[] };
    if (!parsed.corrected || !Array.isArray(parsed.issues)) {
      throw new AIParseError("unexpected shape");
    }
    return parsed as { corrected: string; issues: { excerpt: string; suggestion: string; category: string }[] };
  } catch (err) {
    if (
      err instanceof AIQuotaError ||
      err instanceof AIUnavailableError ||
      err instanceof AIParseError
    ) throw err;
    if (err instanceof SyntaxError) throw new AIParseError(err.message);
    mapError(err);
  }
}

export async function generateSentenceRephrase(
  sentence: string,
  style: "formal" | "casual" | "simple",
): Promise<string[]> {
  try {
    const ai = getClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_REPHRASE,
    });
    const prompt = `Sentence: "${sentence}"\nStyle: ${style}`;
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(json) as { alternates: string[] };
    if (!Array.isArray(parsed.alternates) || parsed.alternates.length < 3) {
      throw new AIParseError("expected 3 alternates");
    }
    return parsed.alternates.slice(0, 3);
  } catch (err) {
    if (
      err instanceof AIQuotaError ||
      err instanceof AIUnavailableError ||
      err instanceof AIParseError
    ) throw err;
    if (err instanceof SyntaxError) throw new AIParseError(err.message);
    mapError(err);
  }
}
