"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallCta() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDismissed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">📱</span>
        <div className="min-w-0">
          <p className="font-medium">Install the app</p>
          <p className="text-sm text-muted-foreground">Learn offline, faster access, no browser UI</p>
        </div>
      </div>
      <div className="flex gap-2 ml-auto">
        <Button size="sm" onClick={handleInstall}>Install</Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Not now</Button>
      </div>
    </div>
  );
}
