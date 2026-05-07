"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export function ResetCountdown({ resetsAt }: { resetsAt: string }) {
  const target = new Date(resetsAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className="tabular-nums">{format(target - now)}</span>;
}
