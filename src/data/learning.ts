import { desc, eq, sql } from 'drizzle-orm';

import { LESSONS, LESSONS_BY_ID } from '@/content/lessons';
import type { Database } from '@/db/client';
import { lessonProgress, streakDays } from '@/db/schema';
import type { Lesson } from '@shared/lessons';
import { BRANCH_META, TAXONOMY_BY_ID, type Branch } from '@shared/taxonomy';

import { localDateKey } from './profile';

/**
 * Lesson progress and streak history.
 *
 * Both are written locally first and flushed by the sync outbox, so reading a
 * lesson on a plane still counts toward the day. The streak day-row is the unit
 * everything else derives from, the counter, the calendar and the at-risk
 * warning all read the same table rather than three separate tallies that can
 * disagree.
 */

// ── Lessons ────────────────────────────────────────────────────────────────

export interface LessonWithState extends Lesson {
  completedAt: string | null;
  branch: Branch;
  branchLabel: string;
}

export async function readLessons(db: Database): Promise<LessonWithState[]> {
  const rows = await db.select().from(lessonProgress);
  const done = new Map(rows.map((row) => [row.lessonId, row.completedAt]));

  return LESSONS.map((lesson) => {
    // A lesson's branch is that of its first cited node; lessons are authored
    // around one idea, so the first node is the subject rather than a tie-break.
    const branch = (TAXONOMY_BY_ID[lesson.nodeIds[0]]?.branch ?? 'ai_engineering') as Branch;
    return {
      ...lesson,
      completedAt: done.get(lesson.id) ?? null,
      branch,
      branchLabel: BRANCH_META[branch].label,
    };
  });
}

export async function isLessonComplete(db: Database, lessonId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.lessonId, lessonId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Mark a lesson read.
 *
 * Idempotent, and it keeps the longest recorded reading time rather than the
 * latest. A re-read to refresh your memory should not overwrite the fact that
 * you originally worked through it properly.
 */
export async function completeLesson(db: Database, lessonId: string, seconds: number) {
  if (!LESSONS_BY_ID[lessonId]) return;
  const now = new Date().toISOString();

  await db
    .insert(lessonProgress)
    .values({ lessonId, completedAt: now, secondsSpent: seconds, syncedAt: null })
    .onConflictDoUpdate({
      target: lessonProgress.lessonId,
      set: { secondsSpent: sql`max(${lessonProgress.secondsSpent}, ${seconds})`, syncedAt: null },
    })
    .run();

  await recordDay(db, { lessonsRead: 1 });
}

export interface LessonStats {
  total: number;
  completed: number;
  secondsSpent: number;
  byBranch: { branch: Branch; label: string; total: number; completed: number }[];
}

export async function lessonStats(db: Database): Promise<LessonStats> {
  const lessons = await readLessons(db);
  const rows = await db.select().from(lessonProgress);

  const grouped = new Map<Branch, { total: number; completed: number }>();
  for (const lesson of lessons) {
    const entry = grouped.get(lesson.branch) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (lesson.completedAt) entry.completed += 1;
    grouped.set(lesson.branch, entry);
  }

  return {
    total: lessons.length,
    completed: lessons.filter((lesson) => lesson.completedAt).length,
    secondsSpent: rows.reduce((sum, row) => sum + row.secondsSpent, 0),
    byBranch: [...grouped.entries()]
      .map(([branch, value]) => ({ branch, label: BRANCH_META[branch].label, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

// ── Streak history ─────────────────────────────────────────────────────────

export interface DayRecord {
  day: string;
  sessions: number;
  xp: number;
  itemsAnswered: number;
  lessonsRead: number;
}

/** True until the first session of the local day has been banked. */
export async function isFirstSessionToday(db: Database, today = localDateKey()): Promise<boolean> {
  const rows = await db.select().from(streakDays).where(eq(streakDays.day, today)).limit(1);
  return rows.length === 0 || rows[0].sessions === 0;
}

/** Add today's activity, creating the day row if this is the first thing today. */
export async function recordDay(
  db: Database,
  delta: Partial<Omit<DayRecord, 'day'>>,
  today = localDateKey()
) {
  await db
    .insert(streakDays)
    .values({
      day: today,
      sessions: delta.sessions ?? 0,
      xp: delta.xp ?? 0,
      itemsAnswered: delta.itemsAnswered ?? 0,
      lessonsRead: delta.lessonsRead ?? 0,
      syncedAt: null,
    })
    .onConflictDoUpdate({
      target: streakDays.day,
      set: {
        sessions: sql`${streakDays.sessions} + ${delta.sessions ?? 0}`,
        xp: sql`${streakDays.xp} + ${delta.xp ?? 0}`,
        itemsAnswered: sql`${streakDays.itemsAnswered} + ${delta.itemsAnswered ?? 0}`,
        lessonsRead: sql`${streakDays.lessonsRead} + ${delta.lessonsRead ?? 0}`,
        syncedAt: null,
      },
    })
    .run();
}

export async function recentDays(db: Database, limit = 120): Promise<DayRecord[]> {
  return db.select().from(streakDays).orderBy(desc(streakDays.day)).limit(limit);
}

export interface StreakSummary {
  current: number;
  longest: number;
  /** True when yesterday counted but today has not yet. */
  atRisk: boolean;
  activeToday: boolean;
  totalDays: number;
  /** Newest first, one entry per day for the calendar strip. */
  days: DayRecord[];
}

function dayKey(offsetFromToday: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - offsetFromToday);
  return localDateKey(date);
}

/**
 * Compute the streak from the day rows.
 *
 * Counting backwards from today, and falling back to yesterday when today is
 * still empty, is what lets the streak survive until midnight rather than
 * appearing broken every morning before you have practiced.
 */
export async function streakSummary(db: Database): Promise<StreakSummary> {
  const days = await recentDays(db, 400);
  const present = new Set(days.map((row) => row.day));

  const activeToday = present.has(dayKey(0));
  let current = 0;
  // Start at today if it counted, otherwise at yesterday, an unfinished today
  // does not break a streak that was intact last night.
  for (let offset = activeToday ? 0 : 1; ; offset += 1) {
    if (!present.has(dayKey(offset))) break;
    current += 1;
  }

  // Longest run anywhere in the history.
  const sorted = [...present].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    if (previous) {
      const gap = Math.round(
        (new Date(`${day}T00:00:00`).getTime() - new Date(`${previous}T00:00:00`).getTime()) /
          86_400_000
      );
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = day;
  }

  return {
    current,
    longest,
    atRisk: !activeToday && current > 0,
    activeToday,
    totalDays: present.size,
    days: days.slice(0, 120),
  };
}
