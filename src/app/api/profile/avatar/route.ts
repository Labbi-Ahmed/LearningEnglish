import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  // Auth check via user session
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed." },
      { status: 422 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 2 MB." }, { status: 422 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${user.id}.${ext}`;

  // Use admin client for storage — auth already verified above
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[POST /api/profile/avatar] upload", uploadError);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (dbError) {
    console.error("[POST /api/profile/avatar] db", dbError);
    return NextResponse.json({ error: "Failed to save avatar URL." }, { status: 500 });
  }

  return NextResponse.json({ url: avatarUrl });
}
