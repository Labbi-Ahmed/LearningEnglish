import { describe, it, expect } from "vitest";
import { nextSchedule } from "./spaced-repetition";

const NOW = new Date("2026-05-06T00:00:00Z");

describe("nextSchedule (SM-2)", () => {
  it("first successful review: rep=1, interval=1d, ease ≈ 2.5", () => {
    const out = nextSchedule(
      { ease_factor: 2.5, interval_days: 1, repetitions: 0 },
      4,
      NOW,
    );
    expect(out.repetitions).toBe(1);
    expect(out.interval_days).toBe(1);
    expect(out.ease_factor).toBeCloseTo(2.5, 5);
    expect(out.next_review_at).toBe("2026-05-07T00:00:00.000Z");
  });

  it("second successful review jumps to 6 days", () => {
    const out = nextSchedule(
      { ease_factor: 2.5, interval_days: 1, repetitions: 1 },
      4,
      NOW,
    );
    expect(out.repetitions).toBe(2);
    expect(out.interval_days).toBe(6);
  });

  it("third+ review multiplies interval by ease_factor", () => {
    const out = nextSchedule(
      { ease_factor: 2.5, interval_days: 6, repetitions: 2 },
      4,
      NOW,
    );
    expect(out.repetitions).toBe(3);
    expect(out.interval_days).toBe(15); // round(6 * 2.5)
  });

  it("failed review resets streak but keeps ease_factor ≥ MIN_EASE", () => {
    const out = nextSchedule(
      { ease_factor: 2.6, interval_days: 30, repetitions: 5 },
      1,
      NOW,
    );
    expect(out.repetitions).toBe(0);
    expect(out.interval_days).toBe(1);
    expect(out.ease_factor).toBeGreaterThanOrEqual(1.3);
    expect(out.ease_factor).toBeLessThan(2.6);
  });

  it("ease_factor floor: repeated bad reviews can't drop below 1.3", () => {
    let s = { ease_factor: 1.4, interval_days: 1, repetitions: 0 };
    for (let i = 0; i < 20; i++) {
      const r = nextSchedule(s, 0, NOW);
      s = {
        ease_factor: r.ease_factor,
        interval_days: r.interval_days,
        repetitions: r.repetitions,
      };
    }
    expect(s.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  it("clamps quality outside 0..5", () => {
    const out = nextSchedule(
      { ease_factor: 2.5, interval_days: 1, repetitions: 0 },
      99,
      NOW,
    );
    // Treated as q=5 → success path
    expect(out.repetitions).toBe(1);
  });
});
