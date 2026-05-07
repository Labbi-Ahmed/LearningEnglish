"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  level: string;
  topic: string;
  completed: boolean;
};

const LEVEL_LABELS: Record<string, string> = {
  a1: "A1 Beginner",
  a2: "A2 Elementary",
  b1: "B1 Intermediate",
  b2: "B2 Upper-Intermediate",
  c1: "C1 Advanced",
  c2: "C2 Proficient",
};

export function LessonList({
  lessons,
  currentLevel,
}: {
  lessons: LessonSummary[];
  currentLevel: string;
}) {
  if (lessons.length === 0) {
    return (
      <p className="text-muted-foreground">
        No lessons found for level {LEVEL_LABELS[currentLevel] ?? currentLevel}. Check back soon!
      </p>
    );
  }

  const completed = lessons.filter((l) => l.completed).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {completed}/{lessons.length} lessons completed
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {lessons.map((lesson) => (
          <Card key={lesson.id} className={lesson.completed ? "border-green-500/40" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {lesson.topic}
                </span>
                {lesson.completed && (
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                )}
              </div>
              <CardTitle className="text-base">{lesson.title}</CardTitle>
              <CardDescription>{LEVEL_LABELS[lesson.level] ?? lesson.level}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant={lesson.completed ? "outline" : "default"}>
                <Link href={`/grammar/${lesson.slug}`}>
                  {lesson.completed ? "Review" : "Start lesson"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
