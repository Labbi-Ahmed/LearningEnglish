import type { CefrLevel } from "@/lib/schemas/placement";

export function LevelChip({ level }: { level: CefrLevel }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide">
      {level}
    </span>
  );
}
