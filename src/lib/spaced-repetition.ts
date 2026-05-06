// SM-2 spaced-repetition algorithm.
// Pure: no Supabase, no Date.now hidden deps (caller passes `now` for testability).

export type SRState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export type SRSchedule = SRState & {
  next_review_at: string; // ISO timestamp
};

const MIN_EASE = 1.3;

export function nextSchedule(
  state: SRState,
  quality: number,
  now: Date = new Date(),
): SRSchedule {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let { repetitions, interval_days, ease_factor } = state;

  // Update ease factor regardless of quality.
  ease_factor = Math.max(
    MIN_EASE,
    ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval_days = 1;
    } else if (repetitions === 2) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
  }

  const next = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

  return {
    ease_factor,
    interval_days,
    repetitions,
    next_review_at: next.toISOString(),
  };
}
