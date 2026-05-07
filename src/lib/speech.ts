export type Accent = "uk" | "us";

function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const timeout = setTimeout(
      () => resolve(window.speechSynthesis.getVoices()),
      2000,
    );
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        clearTimeout(timeout);
        resolve(window.speechSynthesis.getVoices());
      },
      { once: true },
    );
  });
}

export function speak(text: string, accent: Accent): void {
  if (!isSupported() || !text) return;
  void getVoicesReady().then((voices) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const prefix = accent === "uk" ? "en-GB" : "en-US";
      const voice =
        voices.find((v) => v.lang.startsWith(prefix)) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
      if (voice) utter.voice = voice;
      utter.lang = accent === "uk" ? "en-GB" : "en-US";
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {
      // no-op: TTS is best-effort
    }
  });
}

export function cancelSpeech(): void {
  if (!isSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // no-op
  }
}
