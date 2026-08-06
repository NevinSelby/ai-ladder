/**
 * FSRS-4.5 scheduler.
 *
 * Scheduling happens per *taxonomy node*, not per item. That matters: the point
 * is not to re-show the same multiple-choice question until you memorise its
 * wording, it is to resurface the concept, possibly through a different mode
 * entirely. Getting a VPC Service Controls drill wrong should make it more
 * likely you see a VPC-SC constraint inside a Blueprint scenario next week.
 *
 * Weights are the published FSRS-4.5 defaults. They are tuned on a very large
 * flashcard corpus, which is a reasonable prior; re-fitting them on this app's
 * own review log is a later optimization and deliberately out of scope now.
 */

export const FSRS_WEIGHTS = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;

/** 1 again, 2 hard, 3 good, 4 easy. */
export type Rating = 1 | 2 | 3 | 4;

export interface SrsState {
  /** Memory stability, in days. */
  stability: number;
  /** 1..10; higher is harder for this learner. */
  difficulty: number;
  /** ISO timestamp of the last review. */
  lastReview: string | null;
  /** ISO timestamp when this node is next due. */
  due: string;
  reps: number;
  lapses: number;
}

const clampDifficulty = (d: number) => Math.min(10, Math.max(1, d));

/** Probability of recall after `elapsedDays` at the given stability. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function initialStability(rating: Rating): number {
  return Math.max(0.1, FSRS_WEIGHTS[rating - 1]);
}

function initialDifficulty(rating: Rating): number {
  return clampDifficulty(FSRS_WEIGHTS[4] - (rating - 3) * FSRS_WEIGHTS[5]);
}

function nextDifficulty(difficulty: number, rating: Rating): number {
  const delta = difficulty - FSRS_WEIGHTS[6] * (rating - 3);
  // Mean-revert toward the difficulty an "easy" first answer would have set, so
  // a single bad day does not permanently mark a concept as hard.
  const reverted = FSRS_WEIGHTS[7] * initialDifficulty(4) + (1 - FSRS_WEIGHTS[7]) * delta;
  return clampDifficulty(reverted);
}

function stabilityAfterRecall(
  difficulty: number,
  stability: number,
  recall: number,
  rating: Rating
): number {
  const hardPenalty = rating === 2 ? FSRS_WEIGHTS[15] : 1;
  const easyBonus = rating === 4 ? FSRS_WEIGHTS[16] : 1;
  const growth =
    Math.exp(FSRS_WEIGHTS[8]) *
    (11 - difficulty) *
    Math.pow(stability, -FSRS_WEIGHTS[9]) *
    (Math.exp((1 - recall) * FSRS_WEIGHTS[10]) - 1) *
    hardPenalty *
    easyBonus;
  return stability * (1 + growth);
}

function stabilityAfterLapse(difficulty: number, stability: number, recall: number): number {
  return (
    FSRS_WEIGHTS[11] *
    Math.pow(difficulty, -FSRS_WEIGHTS[12]) *
    (Math.pow(stability + 1, FSRS_WEIGHTS[13]) - 1) *
    Math.exp((1 - recall) * FSRS_WEIGHTS[14])
  );
}

/** Days until retention falls to `requestRetention`. */
export function intervalDays(stability: number, requestRetention = 0.9): number {
  const raw = (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

export function newState(now: Date = new Date()): SrsState {
  return {
    stability: 0,
    difficulty: 0,
    lastReview: null,
    due: now.toISOString(),
    reps: 0,
    lapses: 0,
  };
}

export function review(state: SrsState, rating: Rating, now: Date = new Date()): SrsState {
  const isNew = state.reps === 0 || state.lastReview === null;

  let stability: number;
  let difficulty: number;

  if (isNew) {
    stability = initialStability(rating);
    difficulty = initialDifficulty(rating);
  } else {
    const elapsedMs = now.getTime() - new Date(state.lastReview!).getTime();
    const elapsedDays = Math.max(0, elapsedMs / 86_400_000);
    const recall = retrievability(elapsedDays, state.stability);
    difficulty = nextDifficulty(state.difficulty, rating);
    stability =
      rating === 1
        ? stabilityAfterLapse(difficulty, state.stability, recall)
        : stabilityAfterRecall(difficulty, state.stability, recall, rating);
  }

  stability = Math.max(0.1, stability);
  const due = new Date(now.getTime() + intervalDays(stability) * 86_400_000);

  return {
    stability,
    difficulty,
    lastReview: now.toISOString(),
    due: due.toISOString(),
    reps: state.reps + 1,
    lapses: state.lapses + (rating === 1 ? 1 : 0),
  };
}

/**
 * Map an attempt onto an FSRS rating.
 *
 * `elapsedMs` is how long the player took relative to the item's expected time,
 * which is the only "how confident were you" signal available without asking, 
 * and asking every question would wreck a 3-minute session.
 */
export function ratingFromAttempt(correct: boolean, elapsedMs: number, expectedMs: number): Rating {
  if (!correct) return 1;
  if (elapsedMs <= expectedMs * 0.5) return 4;
  if (elapsedMs >= expectedMs * 1.6) return 2;
  return 3;
}

/** Partial-credit scores from the judgment modes, mapped onto the same scale. */
export function ratingFromScore(score: number): Rating {
  if (score < 0.5) return 1;
  if (score < 0.7) return 2;
  if (score < 0.9) return 3;
  return 4;
}

/**
 * Order nodes for a session: most overdue first, then never-seen, so the daily
 * drill always leads with the thing you are closest to forgetting.
 */
export function dueSort(states: Record<string, SrsState>, nodeIds: string[], now = new Date()) {
  const t = now.getTime();
  return [...nodeIds].sort((a, b) => {
    const sa = states[a];
    const sb = states[b];
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    const overdueA = t - new Date(sa.due).getTime();
    const overdueB = t - new Date(sb.due).getTime();
    return overdueB - overdueA;
  });
}

export function isDue(state: SrsState | undefined, now = new Date()): boolean {
  if (!state) return true;
  return new Date(state.due).getTime() <= now.getTime();
}
