"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WritingFeedbackResponse, FeedbackIssue } from "@/lib/schemas/ai";

type RephraseState = {
  open: boolean;
  sentence: string;
  style: "formal" | "casual" | "simple";
  alternates: string[] | null;
  loading: boolean;
};

const CATEGORY_COLOR: Record<string, string> = {
  grammar: "bg-red-100 text-red-800",
  spelling: "bg-orange-100 text-orange-800",
  style: "bg-blue-100 text-blue-800",
  clarity: "bg-purple-100 text-purple-800",
};

export function WritingEditor() {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedbackResponse | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [rephrase, setRephrase] = useState<RephraseState>({
    open: false,
    sentence: "",
    style: "formal",
    alternates: null,
    loading: false,
  });

  async function getFeedback() {
    setFbError(null);
    setFeedback(null);
    setFbLoading(true);
    try {
      const res = await fetch("/api/ai/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 503) { setFbError("AI is busy, try again in a minute."); return; }
      if (!res.ok) { setFbError("Something went wrong."); return; }
      setFeedback((await res.json()) as WritingFeedbackResponse);
    } catch {
      setFbError("Something went wrong.");
    } finally {
      setFbLoading(false);
    }
  }

  function applyCorrection(issue: FeedbackIssue) {
    setText((t) => t.replace(issue.excerpt, issue.suggestion));
  }

  function openRephrase() {
    const selection = window.getSelection()?.toString().trim() ?? "";
    setRephrase({ open: true, sentence: selection || text, style: "formal", alternates: null, loading: false });
  }

  async function doRephrase() {
    setRephrase((r) => ({ ...r, loading: true, alternates: null }));
    try {
      const res = await fetch("/api/ai/sentence-rephrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: rephrase.sentence, style: rephrase.style }),
      });
      if (!res.ok) { setRephrase((r) => ({ ...r, loading: false })); return; }
      const data = (await res.json()) as { alternates: string[] };
      setRephrase((r) => ({ ...r, loading: false, alternates: data.alternates }));
    } catch {
      setRephrase((r) => ({ ...r, loading: false }));
    }
  }

  function applyRephrase(alt: string) {
    setText((t) => t.replace(rephrase.sentence, alt));
    setRephrase((r) => ({ ...r, open: false }));
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full rounded-lg border bg-background p-3 text-sm min-h-[180px] focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        placeholder="Write or paste your English text here… (max 2000 characters)"
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={getFeedback} disabled={fbLoading || text.trim().length === 0}>
          {fbLoading ? "Analysing…" : "Get feedback"}
        </Button>
        <Button variant="outline" onClick={openRephrase} disabled={text.trim().length === 0}>
          Rephrase sentence
        </Button>
      </div>

      {fbError && <p className="text-sm text-destructive">{fbError}</p>}

      {feedback && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-green-50 border-green-200 p-4">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">Corrected text</p>
            <p className="text-sm text-green-900 whitespace-pre-wrap">{feedback.corrected}</p>
          </div>

          {feedback.issues.length === 0 && (
            <p className="text-sm text-muted-foreground">No issues found — great writing!</p>
          )}

          {feedback.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Issues found</p>
              {feedback.issues.map((issue, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[issue.category] ?? "bg-muted text-muted-foreground"}`}>
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="line-through text-muted-foreground">{issue.excerpt}</span>
                    {" → "}
                    <span className="font-medium">{issue.suggestion}</span>
                  </p>
                  <Button size="sm" variant="outline" onClick={() => applyCorrection(issue)}>
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {rephrase.open && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Rephrase sentence</p>
            <button
              type="button"
              className="text-muted-foreground text-xs hover:text-foreground"
              onClick={() => setRephrase((r) => ({ ...r, open: false }))}
            >
              Close
            </button>
          </div>
          <div className="rounded-md bg-muted p-2 text-sm text-muted-foreground line-clamp-3">
            {rephrase.sentence || <span className="italic">No text selected</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Style:</span>
            {(["formal", "casual", "simple"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={rephrase.style === s ? "default" : "outline"}
                onClick={() => setRephrase((r) => ({ ...r, style: s }))}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <Button onClick={doRephrase} disabled={rephrase.loading || !rephrase.sentence}>
            {rephrase.loading ? "Rephrasing…" : "Rephrase"}
          </Button>
          {rephrase.alternates && (
            <div className="space-y-2">
              {rephrase.alternates.map((alt, i) => (
                <div key={i} className="rounded-md border p-3 flex items-center justify-between gap-3">
                  <p className="text-sm flex-1">{alt}</p>
                  <Button size="sm" variant="outline" onClick={() => applyRephrase(alt)}>
                    Use
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
