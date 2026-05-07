"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { INPUT_CAPS } from "@/lib/quotas/limits";

type Turn = { role: "user" | "assistant"; content: string };

const CHAT_CAP = INPUT_CAPS.ai_chat;

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function ChatWindow() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const wordCount = countWords(input);
  const charCount = input.length;
  const overWords = wordCount > CHAT_CAP.words;
  const overChars = charCount > CHAT_CAP.chars;
  const overCap = overWords || overChars;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading || overCap) return;

    setInput("");
    setAiError(false);
    setQuotaError(null);
    setTurns((t) => [...t, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId ?? undefined, message: msg }),
      });

      if (res.status === 429) {
        const data = (await res.json()) as { limit: number; tier: string };
        setQuotaError(
          `You've used today's free AI chats (${data.limit}). Pro and Pro Max plans coming soon.`,
        );
        return;
      }

      if (res.status === 503) {
        setAiError(true);
        return;
      }

      const data = (await res.json()) as { conversation_id: string; reply: string };
      setConvId(data.conversation_id);
      setTurns((t) => [...t, { role: "assistant", content: data.reply }]);
    } catch {
      setAiError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {turns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Say hello to start practising!
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                t.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        {aiError && (
          <p className="text-sm text-destructive text-center">
            AI is busy, try again in a minute.
          </p>
        )}
        {quotaError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            {quotaError}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 space-y-1.5">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
            maxLength={CHAT_CAP.chars + 50}
          />
          <Button onClick={send} disabled={loading || !input.trim() || overCap}>
            Send
          </Button>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums px-0.5">
          <span className={overWords ? "text-destructive font-medium" : ""}>
            {wordCount} / {CHAT_CAP.words} words
          </span>
          <span className={overChars ? "text-destructive font-medium" : ""}>
            {charCount} / {CHAT_CAP.chars} chars
          </span>
        </div>
      </div>
    </div>
  );
}
