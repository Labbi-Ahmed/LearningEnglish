export type Accent = "uk" | "us";

function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(accent: Accent): SpeechSynthesisVoice | null {
  if (!isSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const prefix = accent === "uk" ? "en-GB" : "en-US";
  return (
    voices.find((v) => v.lang.startsWith(prefix)) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export function speak(text: string, accent: Accent): void {
  if (!isSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(accent);
    if (voice) utter.voice = voice;
    utter.lang = accent === "uk" ? "en-GB" : "en-US";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    // no-op: TTS is best-effort
  }
}

export function cancelSpeech(): void {
  if (!isSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // no-op
  }
}
