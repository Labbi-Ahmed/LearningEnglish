export const wordKey = (slug: string) => `word:${slug.trim().toLowerCase()}`;
export const savedSetKey = (userId: string) => `user:${userId}:saved`;
export const savedListKey = (userId: string) => `user:${userId}:words:list`;
