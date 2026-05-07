"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type SubscriptionState =
  | "idle"
  | "loading"
  | "subscribed"
  | "denied"
  | "unsupported"
  | "no-sw";

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

async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? null;
}

export function PushPrompt() {
  const [state, setState] = useState<SubscriptionState>("idle");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [testSent, setTestSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    getActiveRegistration().then(async (reg) => {
      if (!reg) {
        setState("no-sw");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        setState("subscribed");
      }
    });
  }, []);

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidKey) {
      setErrorMsg("Push notifications are not configured (missing VAPID key).");
      return;
    }

    setState("loading");
    setErrorMsg(null);

    let appServerKey: ArrayBuffer;
    try {
      appServerKey = urlBase64ToUint8Array(vapidKey);
    } catch (err) {
      console.error("[push] invalid VAPID key", err);
      setErrorMsg("Push key is malformed. Please contact support.");
      setState("idle");
      return;
    }

    try {
      const reg = await getActiveRegistration();
      if (!reg) {
        setState("no-sw");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
      setSubscription(sub);

      const json = sub.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });

      if (!res.ok) {
        const detail =
          res.status === 401
            ? "Please sign in again."
            : `Failed to save subscription (HTTP ${res.status}).`;
        setErrorMsg(detail);
        setState("idle");
        return;
      }

      setState("subscribed");
    } catch (err) {
      console.error("[push] subscribe failed", err);
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setState("denied");
          return;
        }
        setErrorMsg(`${err.name}: ${err.message}`);
        setState("idle");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(`Something went wrong: ${message}`);
      setState("idle");
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

  // Browser doesn't support push at all
  if (state === "unsupported") return null;

  // Service worker not registered — only works in production build
  if (state === "no-sw") {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 text-sm text-muted-foreground">
        <span className="text-xl">🔔</span>
        <p>Daily reminders are only available in the production build.</p>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">
            {state === "denied"
              ? "Notifications blocked — allow them in your browser settings."
              : "Stay on track with a nudge each day"}
          </p>
          {errorMsg && <p className="text-xs text-destructive mt-0.5">{errorMsg}</p>}
        </div>
      </div>
      <Button
        size="sm"
        onClick={subscribe}
        disabled={state === "loading" || state === "denied"}
      >
        {state === "loading" ? "Enabling…" : state === "denied" ? "Blocked" : "Enable"}
      </Button>
    </div>
  );
}
