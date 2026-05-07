"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, X, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
const LEVEL_LABELS: Record<string, string> = {
  a1: "A1 — Beginner",
  a2: "A2 — Elementary",
  b1: "B1 — Intermediate",
  b2: "B2 — Upper-Intermediate",
  c1: "C1 — Advanced",
  c2: "C2 — Proficient",
};

type Profile = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  level: string | null;
  preferred_accent: string | null;
  avatar_url: string | null;
};

export function ProfileForm({
  initialProfile,
  email,
}: {
  initialProfile: Profile;
  email: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({
    first_name:       initialProfile.first_name ?? "",
    last_name:        initialProfile.last_name ?? "",
    display_name:     initialProfile.display_name ?? "",
    level:            initialProfile.level ?? "a1",
    preferred_accent: initialProfile.preferred_accent ?? "uk",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.avatar_url);

  function cancelEdit() {
    setForm({
      first_name:       initialProfile.first_name ?? "",
      last_name:        initialProfile.last_name ?? "",
      display_name:     initialProfile.display_name ?? "",
      level:            initialProfile.level ?? "a1",
      preferred_accent: initialProfile.preferred_accent ?? "uk",
    });
    setAvatarFile(null);
    setAvatarPreview(initialProfile.avatar_url);
    setMessage(null);
    setEditing(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      // Upload avatar first if changed
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setMessage({ ok: false, text: data.error ?? "Avatar upload failed." });
          return;
        }
      }

      // Update profile fields
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Failed to save." });
        return;
      }

      setMessage({ ok: true, text: "Profile saved!" });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const initials = [initialProfile.first_name, initialProfile.last_name]
    .filter(Boolean)
    .map((n) => n![0]?.toUpperCase())
    .join("") || email[0]?.toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Avatar + name header */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarPreview ?? undefined} alt="Avatar" />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          {editing && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow hover:bg-primary/90"
              aria-label="Change avatar"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg truncate">
            {[initialProfile.first_name, initialProfile.last_name].filter(Boolean).join(" ") || "—"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          <Badge variant="secondary" className="mt-1 uppercase text-[10px]">
            {initialProfile.level ?? "a1"}
          </Badge>
        </div>

        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        )}
      </div>

      {/* Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Email — always read-only */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
          <Input value={email} disabled className="bg-muted/40" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            value={form.first_name}
            disabled={!editing}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            value={form.last_name}
            disabled={!editing}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="display_name">Display name <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            id="display_name"
            placeholder="How you want to appear on the leaderboard"
            value={form.display_name}
            disabled={!editing}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>English level</Label>
          {editing ? (
            <Select
              value={form.level}
              onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={LEVEL_LABELS[form.level] ?? form.level} disabled className="bg-muted/40" />
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Preferred accent</Label>
          {editing ? (
            <Select
              value={form.preferred_accent}
              onValueChange={(v) => setForm((f) => ({ ...f, preferred_accent: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uk">British English (UK)</SelectItem>
                <SelectItem value="us">American English (US)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.preferred_accent === "uk" ? "British English (UK)" : "American English (US)"}
              disabled
              className="bg-muted/40"
            />
          )}
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <p className={`flex items-center gap-1.5 text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>
          {message.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {message.text}
        </p>
      )}

      {/* Edit actions */}
      {editing && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            Save changes
          </Button>
          <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
