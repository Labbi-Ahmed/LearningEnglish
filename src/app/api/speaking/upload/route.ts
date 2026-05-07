import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertWithinQuota } from "@/lib/quotas/enforce";
import { QuotaExceededError } from "@/lib/quotas/errors";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = /^audio\//;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertWithinQuota(supabase, user.id, "speaking_attempt");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(err.toResponseBody(), { status: 429 });
    }
    return NextResponse.json({ error: "quota_check_failed" }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_audio_field" }, { status: 400 });
  }

  if (!ALLOWED_MIME.test(file.type)) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const ext = file.type.includes("mp4") ? "mp4" : "webm";
  const uuid = crypto.randomUUID();
  const storagePath = `${user.id}/${uuid}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("speaking")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    console.error("storage upload failed", uploadError);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: row, error: insertError } = await supabase
    .from("speaking_recordings")
    .insert({ user_id: user.id, audio_url: storagePath })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("db insert failed", insertError);
    return NextResponse.json({ error: "db_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { recording_id: row.id as string, storage_path: storagePath },
    { status: 201 },
  );
}
