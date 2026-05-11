export const wordKey = (slug: string) => `word:${slug.trim().toLowerCase()}`;
export const savedSetKey = (userId: string) => `user:${userId}:saved`;
export const savedListKey = (userId: string) => `user:${userId}:words:list`;

export type WarmKind = "words" | "users";
export const lastRunKey = (kind: WarmKind) =>
  kind === "words" ? "cache:warm:last" : "cache:warm-users:last";
