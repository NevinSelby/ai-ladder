import type { Database } from '@/db/client';
import { retrievability } from '@shared/srs';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

import { readSrsStates } from './session';

/**
 * Predicted retention over the coming weeks.
 *
 * FSRS already models how fast each concept decays; this just plots it. The
 * point is to make the schedule legible: without a curve, "spaced repetition"
 * is a claim, and the user has no way to see that skipping a week actually
 * costs something.
 *
 * Suspended leeches are excluded. They are not being scheduled, so including
 * their decay would show a cliff the user cannot act on.
 */
export interface RetentionPoint {
  /** Days from now. */
  day: number;
  /** Mean predicted recall across scheduled concepts, 0..1. */
  retention: number;
}

export async function retentionForecast(
  db: Database,
  days = 30,
  now = new Date()
): Promise<{ points: RetentionPoint[]; tracked: number; atRisk: number }> {
  const states = await readSrsStates(db);
  const scheduled = Object.entries(states).filter(
    ([nodeId, state]) => !state.suspended && state.reps > 0 && TAXONOMY_BY_ID[nodeId]
  );

  if (scheduled.length === 0) return { points: [], tracked: 0, atRisk: 0 };

  const points: RetentionPoint[] = [];
  for (let day = 0; day <= days; day += 1) {
    let total = 0;
    for (const [, state] of scheduled) {
      const elapsedDays = state.lastReview
        ? (now.getTime() - new Date(state.lastReview).getTime()) / 86_400_000
        : 0;
      total += retrievability(elapsedDays + day, state.stability);
    }
    points.push({ day, retention: total / scheduled.length });
  }

  // Concepts predicted to fall below the 90% target within a week: the ones
  // the scheduler will be bringing back soon.
  const atRisk = scheduled.filter(([, state]) => {
    const elapsedDays = state.lastReview
      ? (now.getTime() - new Date(state.lastReview).getTime()) / 86_400_000
      : 0;
    return retrievability(elapsedDays + 7, state.stability) < 0.9;
  }).length;

  return { points, tracked: scheduled.length, atRisk };
}
