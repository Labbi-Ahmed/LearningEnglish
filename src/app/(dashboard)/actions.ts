"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearUserCaches } from "@/lib/cache/saved-list";

export async function signOutAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();

  if (user) {
    after(() => clearUserCaches(user.id));
  }

  redirect("/login");
}
