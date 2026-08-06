/**
 * Deterministic scoring.
 *
 * Everything here runs on-device: instant, free, and identical to what the
 * server would compute, so an offline attempt never has to be re-scored when it
 * syncs. Only the judgment modes (Decompose, The Room, Arena justifications)
 * need a model, and those live behind an edge function.
 */

import type { DrillPayload } from './content';

export interface Scored {
  /** 0..1. */
  score: number;
  correct: boolean;
  /** Per-part detail the review screen renders. */
  detail: Record<string, unknown>;
}

export type DrillResponse =
  | { kind: 'mcq'; choiceId: string | null }
  | { kind: 'multi'; choiceIds: string[] }
  | { kind: 'match'; assignment: Record<string, string> }
  | { kind: 'order'; sequence: string[] };

/**
 * Kendall-tau concordance, normalized to 0..1.
 *
 * Position-match scoring punishes a single transposition far too harshly, move
 * one item and every later item is also "wrong". Counting correctly-ordered
 * pairs measures what an ordering question is actually asking: do you know what
 * comes before what.
 */
export function orderingScore(answer: string[], correct: string[]): number {
  const rank = new Map(correct.map((step, index) => [step, index]));
  const n = answer.length;
  if (n < 2) return 1;

  let concordant = 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = rank.get(answer[i]);
      const b = rank.get(answer[j]);
      if (a === undefined || b === undefined) continue;
      total += 1;
      if (a < b) concordant += 1;
    }
  }
  return total === 0 ? 0 : concordant / total;
}

/**
 * Multi-select with a penalty for over-selecting.
 *
 * Without the penalty, ticking every box scores full marks, which turns a
 * question about discrimination into a question about enthusiasm.
 */
export function multiSelectScore(selected: string[], correct: string[]): number {
  const correctSet = new Set(correct);
  const hits = selected.filter((id) => correctSet.has(id)).length;
  const misses = selected.length - hits;
  return Math.max(0, Math.min(1, (hits - misses) / correct.length));
}

export function scoreDrill(payload: DrillPayload, response: DrillResponse): Scored {
  switch (payload.kind) {
    case 'mcq': {
      if (response.kind !== 'mcq') break;
      const correct = response.choiceId === payload.correctId;
      return { score: correct ? 1 : 0, correct, detail: { correctId: payload.correctId } };
    }
    case 'multi': {
      if (response.kind !== 'multi') break;
      const score = multiSelectScore(response.choiceIds, payload.correctIds);
      return {
        score,
        correct: score === 1,
        detail: { correctIds: payload.correctIds, missed: payload.correctIds.filter((id) => !response.choiceIds.includes(id)) },
      };
    }
    case 'match': {
      if (response.kind !== 'match') break;
      const results = payload.pairs.map((pair) => ({
        left: pair.left,
        expected: pair.right,
        given: response.assignment[pair.left] ?? null,
        ok: response.assignment[pair.left] === pair.right,
      }));
      const hits = results.filter((r) => r.ok).length;
      const score = hits / payload.pairs.length;
      return { score, correct: score === 1, detail: { results } };
    }
    case 'order': {
      if (response.kind !== 'order') break;
      const score = orderingScore(response.sequence, payload.steps);
      return { score, correct: score === 1, detail: { correctOrder: payload.steps } };
    }
  }
  // Response kind did not match the payload kind. Treat as unanswered rather
  // than throwing. A UI bug should not cost the user their streak.
  return { score: 0, correct: false, detail: { error: 'response/payload mismatch' } };
}

/** Napkin Math: inside the tolerance band is full credit, outside is zero. */
export function scoreNapkin(given: number, answer: number, tolerance: number): Scored {
  if (!Number.isFinite(given) || answer === 0) {
    return { score: 0, correct: false, detail: { ratio: null } };
  }
  const ratio = Math.abs(given - answer) / Math.abs(answer);
  const correct = ratio <= tolerance;
  return { score: correct ? 1 : 0, correct, detail: { ratio, answer, tolerance } };
}
