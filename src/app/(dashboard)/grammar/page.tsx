import { createClient } from "@/lib/supabase/server";
import { LessonList } from "@/components/grammar/lesson-list";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  level: string;
  category: string;
  order_index: number;
  lesson_progress: { completed: boolean }[] | null;
};

export default async function GrammarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", user!.id)
    .single();

  const level = (profile?.level as string) ?? "a1";

  const { data } = await supabase
    .from("grammar_lessons")
    .select("id, slug, title, level, category, order_index, lesson_progress(completed)")
    .eq("level", level)
    .order("order_index");

  const lessons = ((data ?? []) as unknown as LessonRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    level: row.level,
    topic: row.category,
    completed: Array.isArray(row.lesson_progress)
      ? row.lesson_progress.some((p) => p.completed)
      : false,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Grammar Lab</h1>
        <p className="text-muted-foreground mt-1">
          Lessons matched to your level. Complete exercises to track progress.
        </p>
      </div>
      <LessonList lessons={lessons} currentLevel={level} />
    </div>
  );
}
