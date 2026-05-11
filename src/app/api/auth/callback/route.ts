import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydrateUserCachesAfterSignIn } from "@/lib/cache/saved-list";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const userId = data.user?.id;
  if (userId) {
    after(() => hydrateUserCachesAfterSignIn(userId));
  }

  return NextResponse.redirect(`${origin}${next}`);
}
