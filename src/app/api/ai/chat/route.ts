import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChatBodySchema } from "@/lib/schemas/ai";
import { generateChat, AIQuotaError, AIUnavailableError } from "@/lib/gemini";
import { grantXp } from "@/lib/engagement/xp";
import { assertWithinQuota } from "@/lib/quotas/enforce";
import { QuotaExceededError } from "@/lib/quotas/errors";

type Turn = { role: "user" | "model"; content: string };

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { conversation_id, message } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertWithinQuota(supabase, user.id, "ai_chat");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(err.toResponseBody(), { status: 429 });
    }
    return NextResponse.json({ error: "quota_check_failed" }, { status: 500 });
  }

  let convId = conversation_id;
  let history: Turn[] = [];

  if (convId) {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("id", convId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    history = (conv.messages as Turn[] | null) ?? [];
  }

  const turns: Turn[] = [...history, { role: "user", content: message }];

  let reply: string;
  try {
    reply = await generateChat(turns);
  } catch (err) {
    if (err instanceof AIQuotaError || err instanceof AIUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }

  const allTurns: Turn[] = [...turns, { role: "model", content: reply }];

  if (convId) {
    await supabase
      .from("ai_conversations")
      .update({ messages: allTurns })
      .eq("id", convId)
      .eq("user_id", user.id);
  } else {
    const { data: newConv } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, scenario: "general", messages: allTurns })
      .select("id")
      .single();
    convId = (newConv as { id: string } | null)?.id;
  }

  if (convId) {
    await grantXp(supabase, { userId: user.id, source: "chat", refId: convId });
  }
  return NextResponse.json({ conversation_id: convId, reply }, { status: 200 });
}
