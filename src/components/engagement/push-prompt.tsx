"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type SubscriptionState = "idle" | "loading" | "subscribed" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

export function PushPrompt() {
  const [state, setState] = useState<SubscriptionState>("idle");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        setState("subscribed");
      }
    });
  }, []);

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      setSubscription(sub);

      const json = sub.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });
      setState("subscribed");
    } catch {
      setState("denied");
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    await fetch("/api/notifications/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    setSubscription(null);
    setState("idle");
  }

  async function sendTest() {
    setTestSent(false);
    await fetch("/api/notifications/test", { method: "POST" });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  if (state === "unsupported") return null;

  if (state === "subscribed") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-5 py-3">
        <span className="text-xl">🔔</span>
        <p className="flex-1 text-sm">Daily reminders are enabled.</p>
        <Button size="sm" variant="outline" onClick={sendTest}>
          {testSent ? "Sent!" : "Test notification"}
        </Button>
        <Button size="sm" variant="ghost" onClick={unsubscribe}>Turn off</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div>
          <p className="font-medium">Enable daily reminders</p>
          <p className="text-sm text-muted-foreground">Stay on track with a nudge each day</p>
        </div>
      </div>
      <Button size="sm" onClick={subscribe} disabled={state === "loading" || state === "denied"}>
        {state === "loading" ? "Enabling…" : state === "denied" ? "Blocked" : "Enable"}
      </Button>
    </div>
  );
}
