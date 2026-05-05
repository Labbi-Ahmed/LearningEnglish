import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">
        Signed in as <span className="font-medium">{user?.email}</span>. Vocabulary,
        games, and lessons are coming in the next phases.
      </p>
    </div>
  );
}
