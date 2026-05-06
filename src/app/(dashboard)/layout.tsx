import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { QueryProvider } from "@/components/providers/query-provider";
import { signOutAction } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dueCount = 0;
  if (user) {
    const { count } = await supabase
      .from("user_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString());
    dueCount = Math.min(count ?? 0, 99);
  }

  return (
    <QueryProvider>
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="font-semibold">
                English
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/vocabulary" className="text-muted-foreground hover:text-foreground">
                  Vocabulary
                </Link>
                <Link
                  href="/review"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                >
                  Review
                  {dueCount > 0 && (
                    <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                      {dueCount}
                    </span>
                  )}
                </Link>
                <Link href="/games" className="text-muted-foreground hover:text-foreground">
                  Games
                </Link>
                <Link href="/grammar" className="text-muted-foreground hover:text-foreground">
                  Grammar
                </Link>
                <Link href="/roadmap" className="text-muted-foreground hover:text-foreground">
                  Roadmap
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="container py-8">{children}</main>
      </div>
    </QueryProvider>
  );
}
