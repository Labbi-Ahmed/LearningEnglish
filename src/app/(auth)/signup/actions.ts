"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type SignupActionResult =
  | { error: string }
  | { ok: true; needsConfirmation: boolean }
  | undefined;

export async function signUpAction(
  _prev: SignupActionResult,
  formData: FormData,
): Promise<SignupActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    console.error("[signUp] supabase error", error);
    return { error: "Could not create account. The email may already be in use." };
  }

  const needsConfirmation = !data.session;
  if (!needsConfirmation) {
    redirect("/dashboard");
  }

  return { ok: true, needsConfirmation: true };
}
