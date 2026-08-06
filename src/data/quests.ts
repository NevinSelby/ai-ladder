import { and, eq, gte, inArray } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { attempts, contentItems, questClaims, streakDays } from '@/db/schema';
import { awardPoints, localDateKey } from '@/data/profile';

/**
 * Daily quests.
 *
 * Three small goals a day, paid in points. They exist to give a session a
 * second reason to happen ("one more question finishes the quest") without
 * touching XP: quests reward behavior, XP measures skill, and the two never
 * mix.
 *
 * Completion is derived from data the app already records (attempts and the
 * day ledger), so there is no live quest-progress bookkeeping to get wrong.
 * A claim row per (day, quest) makes the payout idempotent: `refreshQuests`
 * can run on every Today-screen focus and each quest still pays exactly once.
 */

export interface QuestStatus {
  id: string;
  title: string;
  detail: string;
  points: number;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
}

interface QuestDef {
  id: string;
  title: string;
  detail: string;
  points: number;
  target: number;
  progress: (facts: DayFacts) => number;
}

interface DayFacts {
  sessions: number;
  lessonsRead: number;
  dayXp: number;
  attemptsToday: number;
  arenaAttempts: number;
  hardCorrect: number;
}

/** The anchor quest, present every day: it is the streak in quest form. */
const SESSION_QUEST: QuestDef = {
  id: 'session',
  title: 'Complete a session',
  detail: 'Finish any drill or arena run.',
  points: 10,
  target: 1,
  progress: (f) => f.sessions,
};

/** Rotating pool; two are drawn per day so the card asks something different daily. */
const POOL: QuestDef[] = [
  {
    id: 'items8',
    title: 'Answer 8 questions',
    detail: 'Across any modes, right or wrong.',
    points: 15,
    target: 8,
    progress: (f) => f.attemptsToday,
  },
  {
    id: 'hard2',
    title: 'Land 2 hard calls',
    detail: 'Fully correct answers on Hard or Expert questions.',
    points: 20,
    target: 2,
    progress: (f) => f.hardCorrect,
  },
  {
    id: 'arena3',
    title: 'Make 3 arena calls',
    detail: 'Trade-off Arena rounds, defensible or not.',
    points: 15,
    target: 3,
    progress: (f) => f.arenaAttempts,
  },
  {
    id: 'lesson',
    title: 'Read a lesson',
    detail: 'Any card in the Learn tab, start to finish.',
    points: 15,
    target: 1,
    progress: (f) => f.lessonsRead,
  },
  {
    id: 'xp60',
    title: 'Earn 60 XP',
    detail: 'Banked XP from completed sessions today.',
    points: 15,
    target: 60,
    progress: (f) => f.dayXp,
  },
];

/** Deterministic pick of two pool quests for a date, so every device agrees. */
export function questsForDay(day: string): QuestDef[] {
  // Day number since epoch; stable regardless of timezone because `day` is
  // already the user's local calendar date.
  const n = Math.floor(new Date(`${day}T12:00:00`).getTime() / 86_400_000);
  const first = n % POOL.length;
  const second = (n + 2) % POOL.length;
  return [SESSION_QUEST, POOL[first], POOL[second === first ? (second + 1) % POOL.length : second]];
}

async function dayFacts(db: Database, day: string): Promise<DayFacts> {
  const ledger = await db.select().from(streakDays).where(eq(streakDays.day, day)).limit(1);

  // Attempts carry full ISO timestamps; the day's rows all share the date prefix.
  const todays = await db
    .select({
      mode: attempts.mode,
      score: attempts.score,
      difficulty: contentItems.difficulty,
    })
    .from(attempts)
    .leftJoin(contentItems, eq(attempts.itemId, contentItems.id))
    .where(gte(attempts.createdAt, day));

  return {
    sessions: ledger[0]?.sessions ?? 0,
    lessonsRead: ledger[0]?.lessonsRead ?? 0,
    dayXp: ledger[0]?.xp ?? 0,
    attemptsToday: todays.length,
    arenaAttempts: todays.filter((a) => a.mode === 'arena').length,
    hardCorrect: todays.filter(
      (a) => a.score >= 1 && (a.difficulty === 'deep' || a.difficulty === 'edge')
    ).length,
  };
}

/**
 * Compute today's quest statuses and pay out any newly completed ones.
 * Returns the list for display plus how many points this call just awarded,
 * so the caller can celebrate only fresh completions.
 */
export async function refreshQuests(
  db: Database,
  today = localDateKey()
): Promise<{ quests: QuestStatus[]; justEarned: number }> {
  const defs = questsForDay(today);
  const facts = await dayFacts(db, today);
  const claimed = await db
    .select()
    .from(questClaims)
    .where(
      and(
        eq(questClaims.day, today),
        inArray(
          questClaims.questId,
          defs.map((d) => d.id)
        )
      )
    );
  const claimedIds = new Set(claimed.map((c) => c.questId));

  let justEarned = 0;
  const quests: QuestStatus[] = [];
  for (const def of defs) {
    const progress = Math.min(def.target, def.progress(facts));
    const done = progress >= def.target;
    let isClaimed = claimedIds.has(def.id);

    if (done && !isClaimed) {
      await db
        .insert(questClaims)
        .values({
          day: today,
          questId: def.id,
          points: def.points,
          claimedAt: new Date().toISOString(),
        })
        .onConflictDoNothing();
      await awardPoints(db, def.points);
      justEarned += def.points;
      isClaimed = true;
    }

    quests.push({
      id: def.id,
      title: def.title,
      detail: def.detail,
      points: def.points,
      target: def.target,
      progress,
      done,
      claimed: isClaimed,
    });
  }

  return { quests, justEarned };
}
