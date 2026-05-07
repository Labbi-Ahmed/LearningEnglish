"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character.");

const signupSchema = z
  .object({
    first_name: z.string().min(1, "First name is required.").max(50),
    last_name: z.string().min(1, "Last name is required.").max(50),
    email: z.string().email("Please enter a valid email address."),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
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
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { first_name, last_name, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name, last_name },
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
