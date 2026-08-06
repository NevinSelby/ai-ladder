import { desc, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { attempts } from '@/db/schema';
import type { ContentItem } from '@shared/content';
import { awardXp, comboMultiplier, streakMultiplier } from '@shared/progression';
import { newState, ratingFromAttempt, ratingFromScore, review } from '@shared/srs';
import { meterForNodes, type MeterKey } from '@shared/taxonomy';

import { readSrsStates, writeSrsState } from './session';

export interface RecordedAttempt {
  id: string;
  itemId: string;
  meter: MeterKey;
  xp: number;
  score: number;
}

let attemptCounter = 0;
function attemptId(): string {
  attemptCounter += 1;
  return `att_${Date.now().toString(36)}_${attemptCounter.toString(36)}`;
}

export interface AttemptParams {
  item: ContentItem;
  score: number;
  response: unknown;
  feedback?: unknown;
  elapsedMs: number;
  expectedMs: number;
  streakDays: number;
  /** Consecutive fully-correct answers so far this session, including this one. */
  combo?: number;
  /** Judgment modes score continuously; drills are effectively pass/fail. */
  continuous?: boolean;
}

/** An attempt scored in memory but not yet written anywhere. */
export interface PlannedAttempt extends RecordedAttempt {
  params: AttemptParams;
  createdAt: string;
}

/**
 * Score one attempt without touching the database.
 *
 * Nothing persists until `persistAttempts` runs at session end. That is the
 * contract the quit dialog makes: leaving a session mid-way discards it
 * completely, so no attempt, XP, SRS update or analytics row may exist for a
 * session that was never finished.
 */
export function planAttempt(params: AttemptParams, now = new Date()): PlannedAttempt {
  const { item, score, streakDays, combo = 0 } = params;

  const meter = meterForNodes(item.nodeIds);
  const baseXp = awardXp(item.mode, item.difficulty, score);
  const xp = Math.round(baseXp * streakMultiplier(streakDays) * comboMultiplier(combo));
  const id = attemptId();

  return { id, itemId: item.id, meter, xp, score, params, createdAt: now.toISOString() };
}

/**
 * Write a finished session's attempts and advance FSRS for every node touched,
 * in answer order so repeat nodes compound the way they were experienced.
 */
export async function persistAttempts(db: Database, planned: PlannedAttempt[]): Promise<void> {
  for (const attempt of planned) {
    const { item, score, response, feedback, elapsedMs, expectedMs } = attempt.params;

    await db
      .insert(attempts)
      .values({
        id: attempt.id,
        itemId: item.id,
        mode: item.mode,
        score,
        response,
        feedback: feedback ?? null,
        meter: attempt.meter,
        xp: attempt.xp,
        elapsedMs,
        createdAt: attempt.createdAt,
        syncedAt: null,
      })
      .run();

    const now = new Date(attempt.createdAt);
    const rating = attempt.params.continuous
      ? ratingFromScore(score)
      : ratingFromAttempt(score >= 1, elapsedMs, expectedMs);

    const states = await readSrsStates(db);
    for (const nodeId of item.nodeIds) {
      const previous = states[nodeId] ?? newState(now);
      await writeSrsState(db, nodeId, review(previous, rating, now));
    }
  }
}

export interface AttemptSummary {
  total: number;
  last7Days: number;
  averageScore: number;
}

export async function attemptSummary(db: Database): Promise<AttemptSummary> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      recent: sql<number>`sum(case when ${attempts.createdAt} >= ${cutoff} then 1 else 0 end)`,
      avg: sql<number>`avg(${attempts.score})`,
    })
    .from(attempts);

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    last7Days: row?.recent ?? 0,
    averageScore: row?.avg ?? 0,
  };
}

export async function recentAttempts(db: Database, limit = 20) {
  return db.select().from(attempts).orderBy(desc(attempts.createdAt)).limit(limit);
}
