import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RephraseBodySchema } from "@/lib/schemas/ai";
import {
  generateSentenceRephrase,
  AIQuotaError,
  AIUnavailableError,
  AIParseError,
} from "@/lib/gemini";
import { createHash } from "crypto";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RephraseBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { sentence, style } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const hash = createHash("sha256").update(`${sentence}::${style}`).digest("hex");

  // Cache check
  const { data: cached } = await supabase
    .from("ai_rephrase_cache")
    .select("alternates, created_at")
    .eq("sentence_hash", hash)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.created_at as string).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ alternates: cached.alternates }, { status: 200 });
    }
  }

  let alternates: string[];
  try {
    alternates = await generateSentenceRephrase(sentence, style);
  } catch (err) {
    if (err instanceof AIQuotaError || err instanceof AIUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    if (err instanceof AIParseError) {
      return NextResponse.json({ error: "ai_parse_error" }, { status: 502 });
    }
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }

  // Upsert cache (best-effort — ignore error)
  await supabase
    .from("ai_rephrase_cache")
    .upsert({ sentence_hash: hash, style, alternates, created_at: new Date().toISOString() });

  return NextResponse.json({ alternates }, { status: 200 });
}
