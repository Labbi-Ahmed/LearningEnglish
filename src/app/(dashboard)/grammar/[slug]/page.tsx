import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LessonContentSchema } from "@/lib/schemas/grammar";
import { LessonRenderer } from "@/components/grammar/lesson-renderer";
import { ExerciseRunner } from "@/components/grammar/exercise-runner";

type Props = { params: Promise<{ slug: string }> };

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("grammar_lessons")
    .select("id, slug, title, level, category, content")
    .eq("slug", slug)
    .single();

  if (error || !data) notFound();

  const contentParsed = LessonContentSchema.safeParse(data.content);
  if (!contentParsed.success) notFound();

  const content = contentParsed.data;

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <Link href="/grammar" className="text-sm text-muted-foreground hover:text-foreground">
          ← Grammar Lab
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <span className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {(data as { level: string }).level.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {(data as { category: string }).category}
        </p>
      </div>

      <LessonRenderer body={content.body} />

      <ExerciseRunner
        lessonId={data.id}
        exercises={content.exercises}
        key={user?.id}
      />
    </div>
  );
}
