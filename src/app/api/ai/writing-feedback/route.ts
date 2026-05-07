import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WritingFeedbackBodySchema, WritingFeedbackResponseSchema } from "@/lib/schemas/ai";
import {
  generateWritingFeedback,
  AIQuotaError,
  AIUnavailableError,
  AIParseError,
} from "@/lib/gemini";
import { assertWithinQuota } from "@/lib/quotas/enforce";
import { QuotaExceededError } from "@/lib/quotas/errors";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = WritingFeedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    if (issue?.message === "empty_text" || issue?.code === "too_small") {
      return NextResponse.json({ error: "empty_text" }, { status: 400 });
    }
    if (issue?.code === "too_big") {
      return NextResponse.json({ error: "text_too_long" }, { status: 413 });
    }
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertWithinQuota(supabase, user.id, "ai_feedback");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(err.toResponseBody(), { status: 429 });
    }
    return NextResponse.json({ error: "quota_check_failed" }, { status: 500 });
  }

  let raw: Awaited<ReturnType<typeof generateWritingFeedback>>;
  try {
    raw = await generateWritingFeedback(parsed.data.text);
  } catch (err) {
    if (err instanceof AIQuotaError || err instanceof AIUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    if (err instanceof AIParseError) {
      return NextResponse.json({ error: "ai_parse_error" }, { status: 502 });
    }
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }

  const validated = WritingFeedbackResponseSchema.safeParse(raw);
  if (!validated.success) {
    return NextResponse.json({ error: "ai_parse_error" }, { status: 502 });
  }

  return NextResponse.json(validated.data, { status: 200 });
}
