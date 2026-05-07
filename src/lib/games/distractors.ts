import type { SupabaseClient } from "@supabase/supabase-js";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

export async function pickDistractors(
  supabase: SupabaseClient,
  excludeWordId: string,
  n: number,
  field: "meaning" | "word",
  candidates: string[],
): Promise<string[]> {
  const picked = shuffle(candidates).slice(0, n);
  if (picked.length >= n) return picked;

  const needed = n - picked.length;
  const { data } = await supabase
    .from("words")
    .select(field)
    .neq("id", excludeWordId)
    .not(field, "is", null)
    .limit(needed * 4);

  const fallback = shuffle(
    ((data ?? []) as Record<string, string | null>[])
      .map((r) => r[field])
      .filter((v): v is string => v != null && !picked.includes(v)),
  ).slice(0, needed);

  return [...picked, ...fallback];
}
