import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { getTier } from "@/lib/quotas/get-tier";
import { TIER_LABEL } from "@/lib/quotas/limits";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, level, preferred_accent, avatar_url")
    .eq("id", user.id)
    .single();

  const tier = await getTier(supabase, user.id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
        </div>
        <Link
          href="/usage"
          className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold hover:bg-primary/15 transition-colors"
        >
          {TIER_LABEL[tier]} plan
        </Link>
      </div>

      <ProfileForm
        initialProfile={{
          first_name:       profile?.first_name ?? null,
          last_name:        profile?.last_name ?? null,
          display_name:     profile?.display_name ?? null,
          level:            profile?.level ?? null,
          preferred_accent: profile?.preferred_accent ?? null,
          avatar_url:       profile?.avatar_url ?? null,
        }}
        email={user.email ?? ""}
      />
    </div>
  );
}
