import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LessonContentSchema } from "@/lib/schemas/grammar";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("grammar_lessons")
    .select("id, slug, title, level, category, content, order_index")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentParsed = LessonContentSchema.safeParse(data.content);
  if (!contentParsed.success) {
    console.error("lesson content schema mismatch", slug, contentParsed.error);
    return NextResponse.json({ error: "invalid_content" }, { status: 500 });
  }

  // Also fetch the user's progress for this lesson
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("completed, score, completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", data.id)
    .maybeSingle();

  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    title: data.title,
    level: data.level,
    topic: (data as { category: string }).category,
    content: contentParsed.data,
    progress: progress ?? null,
  });
}
