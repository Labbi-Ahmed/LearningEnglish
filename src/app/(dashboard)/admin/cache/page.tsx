import { readLastRun } from "@/lib/cache/run-log";
import { CachePanel } from "./cache-panel";

export default async function AdminCachePage() {
  const [words, users] = await Promise.all([
    readLastRun("words"),
    readLastRun("users"),
  ]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cache controls</h2>
        <p className="text-sm text-muted-foreground">
          Manually trigger the Redis warming jobs. Both run on a daily cron;
          this page is for ad-hoc runs (e.g. right after a deploy).
        </p>
      </div>
      <CachePanel initialWords={words} initialUsers={users} />
    </section>
  );
}
