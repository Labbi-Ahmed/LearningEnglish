"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { INPUT_CAPS } from "@/lib/quotas/limits";

const MAX_RECORD_SECONDS: number = INPUT_CAPS.speaking_attempt.seconds;

// Web Speech API types (not yet in all TS lib.dom versions)
type SRAlternative = { transcript: string };
type SRResult = { isFinal: boolean } & ArrayLike<SRAlternative>;
type SREvent = { results: ArrayLike<SRResult> };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor | undefined;
    webkitSpeechRecognition: SpeechRecognitionConstructor | undefined;
  }
}

type ScoreResult = {
  accuracy_score: number;
  target_text: string;
  transcript: string;
};

export function Recorder({ prompts }: { prompts: string[] }) {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORD_SECONDS);

  const prompt = prompts[promptIndex % prompts.length];

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    setSupported(!!SR);
  }, []);

  async function startRecording() {
    setError(null);
    setResult(null);
    setTranscript("");
    chunksRef.current = [];

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      return;
    }

    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start();

    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r && r.isFinal) final += (r[0]?.transcript ?? "") + " ";
      }
      setTranscript(final.trim());
    };
    rec.start();
    setRecording(true);
    setSecondsLeft(MAX_RECORD_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          void stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function stopRecording() {
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recognitionRef.current?.stop();
    mediaRef.current?.stop();

    await new Promise<void>((res) => {
      if (!mediaRef.current) { res(); return; }
      mediaRef.current.onstop = () => res();
    });

    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "recording.webm");

      const uploadRes = await fetch("/api/speaking/upload", { method: "POST", body: form });
      if (uploadRes.status === 429) {
        const data = (await uploadRes.json()) as { limit: number };
        setError(`You've used today's free speaking attempts (${data.limit}). Pro and Pro Max plans coming soon.`);
        return;
      }
      if (!uploadRes.ok) { setError("Upload failed."); return; }
      const { recording_id } = (await uploadRes.json()) as { recording_id: string };

      const scoreRes = await fetch("/api/speaking/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id, target_text: prompt, transcript }),
      });
      if (!scoreRes.ok) { setError("Scoring failed."); return; }
      const scored = (await scoreRes.json()) as ScoreResult;
      setResult(scored);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-xl border bg-yellow-50 border-yellow-200 p-6 text-center text-sm text-yellow-800">
        Live transcription unavailable in this browser — try Chrome.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Prompt</p>
        <p className="text-lg font-medium">{prompt}</p>
      </div>

      {transcript && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <span className="font-medium text-muted-foreground">Transcript: </span>
          {transcript}
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm font-medium">
            Score:{" "}
            <span
              className={
                result.accuracy_score >= 80
                  ? "text-green-600"
                  : result.accuracy_score >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
              }
            >
              {result.accuracy_score}%
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Word-level accuracy against the prompt.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        {!recording ? (
          <Button onClick={startRecording} disabled={busy || supported === null}>
            {busy ? "Scoring…" : "Start recording"}
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording}>
            Stop & score · {secondsLeft}s left
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setPromptIndex((i) => i + 1);
            setResult(null);
            setTranscript("");
            setError(null);
          }}
          disabled={recording || busy}
        >
          Next prompt
        </Button>
      </div>
    </div>
  );
}
