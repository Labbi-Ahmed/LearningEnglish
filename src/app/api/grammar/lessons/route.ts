import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LessonsQuerySchema } from "@/lib/schemas/grammar";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = LessonsQuerySchema.safeParse({
    level: url.searchParams.get("level") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Resolve level: query param → profile default
  let level = parsed.data.level;
  if (!level) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("level")
      .eq("id", user.id)
      .single();
    level = (profile?.level as typeof level) ?? "a1";
  }

  const { data, error } = await supabase
    .from("grammar_lessons")
    .select("id, slug, title, level, category, order_index, lesson_progress(completed)")
    .eq("level", level)
    .order("order_index");

  if (error) {
    console.error("grammar lessons list failed", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  type Row = {
    id: string;
    slug: string;
    title: string;
    level: string;
    category: string;
    order_index: number;
    lesson_progress: { completed: boolean }[] | null;
  };

  const items = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    level: row.level,
    topic: row.category,
    order_index: row.order_index,
    completed: Array.isArray(row.lesson_progress)
      ? row.lesson_progress.some((p) => p.completed)
      : false,
  }));

  return NextResponse.json({ items, level });
}
