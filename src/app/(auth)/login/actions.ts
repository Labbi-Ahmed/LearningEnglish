"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { hydrateUserCachesAfterSignIn } from "@/lib/cache/saved-list";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthActionResult = { error: string } | undefined;

export async function signInAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("[signIn] supabase error", error);
    return { error: "Invalid email or password." };
  }

  const userId = data.user?.id;
  if (userId) {
    after(() => hydrateUserCachesAfterSignIn(userId));
  }

  redirect("/dashboard");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.APP_URL}/api/auth/callback`,
    },
  });

  if (error || !data.url) {
    console.error("[signInWithGoogle] supabase error", error);
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}
