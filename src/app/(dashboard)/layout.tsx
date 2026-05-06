import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { QueryProvider } from "@/components/providers/query-provider";
import { signOutAction } from "./actions";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",   icon: "🏠" },
  { href: "/vocabulary",  label: "Vocabulary",   icon: "📖" },
  { href: "/review",      label: "Review",       icon: "🔄" },
  { href: "/games",       label: "Games",        icon: "🎮" },
  { href: "/grammar",     label: "Grammar",      icon: "✏️" },
  { href: "/speaking",    label: "Speaking",     icon: "🎙️" },
  { href: "/writing",     label: "Writing",      icon: "📝" },
  { href: "/chat",        label: "AI Chat",      icon: "💬" },
  { href: "/roadmap",     label: "Roadmap",      icon: "🗺️" },
  { href: "/leaderboard", label: "Leaderboard",  icon: "🏆" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-card">
          <div className="flex h-14 items-center px-5 border-b">
            <Link href="/dashboard" className="font-bold text-lg tracking-tight">
              English
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
                {href === "/review" && dueCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {dueCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Account block */}
          <div className="border-t px-3 py-3 space-y-1">
            <p className="truncate px-2 text-xs text-muted-foreground">{user?.email}</p>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <span>↩</span> Sign out
              </Button>
            </form>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href="/dashboard" className="font-bold text-lg">English</Link>
          <div className="flex items-center gap-2 overflow-x-auto max-w-[70vw]">
            {NAV_ITEMS.map(({ href, icon }) => (
              <Link key={href} href={href} className="text-xl p-1 text-muted-foreground hover:text-foreground relative">
                {icon}
                {href === "/review" && dueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center">
                    {dueCount > 9 ? "9+" : dueCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="md:hidden h-14" />
          <div className="container py-8">{children}</div>
        </main>
      </div>
    </QueryProvider>
  );
}
