"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function Greeting({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {greeting ?? "Welcome"}
      {firstName ? `, ${firstName}` : ""}
    </h1>
  );
}
