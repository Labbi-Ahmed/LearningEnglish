import type { QuotaAction, Tier } from "./limits";

export class QuotaExceededError extends Error {
  constructor(
    public readonly action: QuotaAction,
    public readonly tier: Tier,
    public readonly limit: number,
    public readonly used: number,
    public readonly resetsAt: Date,
  ) {
    super("quota_exceeded");
    this.name = "QuotaExceededError";
  }

  toResponseBody() {
    return {
      error: "quota_exceeded",
      tier: this.tier,
      limit: this.limit,
      used: this.used,
      action: this.action,
      resets_at: this.resetsAt.toISOString(),
    };
  }
}
