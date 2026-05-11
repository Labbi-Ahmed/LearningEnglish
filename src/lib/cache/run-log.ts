import "server-only";

import { lastRunKey, type WarmKind } from "./keys";
import { safeGet, safeSet } from "./redis";

export type RunLogEntry = {
  ranAt: string;
  actorId: string;
  result: Record<string, unknown>;
};

export async function readLastRun(kind: WarmKind): Promise<RunLogEntry | null> {
  return safeGet<RunLogEntry>(lastRunKey(kind));
}

export async function writeLastRun(
  kind: WarmKind,
  actorId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const entry: RunLogEntry = {
    ranAt: new Date().toISOString(),
    actorId,
    result,
  };
  await safeSet(lastRunKey(kind), entry);
}
