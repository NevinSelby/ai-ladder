import { eq } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { profileState } from '@/db/schema';
import { ZERO_METERS, type DailyGoal, type Meters } from '@shared/progression';
import type { MeterKey } from '@shared/taxonomy';

export interface Profile {
  meters: Meters;
  streakDays: number;
  longestStreak: number;
  bestCombo: number;
  points: number;
  dailyGoal: DailyGoal;
  displayName: string | null;
  hapticsEnabled: boolean;
  lastSessionDate: string | null;
  remoteUserId: string | null;
}

export const EMPTY_PROFILE: Profile = {
  meters: ZERO_METERS,
  streakDays: 0,
  longestStreak: 0,
  bestCombo: 0,
  points: 0,
  dailyGoal: 'regular',
  displayName: null,
  hapticsEnabled: true,
  lastSessionDate: null,
  remoteUserId: null,
};

type Row = typeof profileState.$inferSelect;

export function rowToProfile(row: Row | undefined): Profile {
  if (!row) return EMPTY_PROFILE;
  return {
    meters: {
      depth: row.depth,
      platform: row.platform,
      aiCraft: row.aiCraft,
      client: row.client,
      scope: row.scope,
    },
    streakDays: row.streakDays,
    longestStreak: row.longestStreak,
    bestCombo: row.bestCombo,
    points: row.points,
    dailyGoal: (row.dailyGoal as DailyGoal) ?? 'regular',
    displayName: row.displayName,
    hapticsEnabled: row.hapticsEnabled !== 0,
    lastSessionDate: row.lastSessionDate,
    remoteUserId: row.remoteUserId,
  };
}

export async function setDisplayName(db: Database, name: string) {
  const trimmed = name.trim().slice(0, 40);
  await db
    .update(profileState)
    .set({ displayName: trimmed.length > 0 ? trimmed : null, syncedAt: null })
    .where(eq(profileState.id, 1))
    .run();
}

export async function setHapticsEnabled(db: Database, enabled: boolean) {
  await db
    .update(profileState)
    .set({ hapticsEnabled: enabled ? 1 : 0 })
    .where(eq(profileState.id, 1))
    .run();
}

export async function setDailyGoal(db: Database, goal: DailyGoal) {
  await db
    .update(profileState)
    .set({ dailyGoal: goal, syncedAt: null })
    .where(eq(profileState.id, 1))
    .run();
}

/** Add spendable points. Additive and append-only for now; spending comes later. */
export async function awardPoints(db: Database, amount: number): Promise<void> {
  if (amount <= 0) return;
  const profile = await readProfile(db);
  await db
    .update(profileState)
    .set({ points: profile.points + amount, syncedAt: null })
    .where(eq(profileState.id, 1))
    .run();
}

export async function readProfile(db: Database): Promise<Profile> {
  const rows = await db.select().from(profileState).where(eq(profileState.id, 1)).limit(1);
  return rowToProfile(rows[0]);
}

/** Local calendar date, not UTC. A streak should follow the user's day. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayDifference(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export interface StreakUpdate {
  streakDays: number;
  longestStreak: number;
  /** True when this session is the one that extended the streak today. */
  extended: boolean;
}

/**
 * Streak arithmetic.
 *
 * A same-day repeat session does not extend the streak, practicing twice on
 * Tuesday is good, but it is not two days. A gap of two or more days resets to
 * one rather than to zero: you did just show up.
 */
export function nextStreak(profile: Profile, today = localDateKey()): StreakUpdate {
  const { lastSessionDate, streakDays, longestStreak } = profile;

  if (lastSessionDate === today) {
    return { streakDays, longestStreak, extended: false };
  }

  const gap = lastSessionDate ? dayDifference(lastSessionDate, today) : Infinity;
  const next = gap === 1 ? streakDays + 1 : 1;

  return {
    streakDays: next,
    longestStreak: Math.max(longestStreak, next),
    extended: true,
  };
}

/** True if the streak is intact but today's session has not happened yet. */
export function streakAtRisk(profile: Profile, today = localDateKey()): boolean {
  if (!profile.lastSessionDate || profile.streakDays === 0) return false;
  return dayDifference(profile.lastSessionDate, today) === 1;
}

export async function applySessionResult(
  db: Database,
  gains: Partial<Record<MeterKey, number>>,
  sessionBestCombo = 0,
  today = localDateKey()
): Promise<Profile> {
  const profile = await readProfile(db);
  const streak = nextStreak(profile, today);
  const bestCombo = Math.max(profile.bestCombo, sessionBestCombo);

  const meters: Meters = { ...profile.meters };
  for (const [key, value] of Object.entries(gains) as [MeterKey, number][]) {
    meters[key] += value;
  }

  await db
    .update(profileState)
    .set({
      depth: meters.depth,
      platform: meters.platform,
      aiCraft: meters.aiCraft,
      client: meters.client,
      scope: meters.scope,
      streakDays: streak.streakDays,
      longestStreak: streak.longestStreak,
      bestCombo,
      lastSessionDate: today,
      syncedAt: null,
    })
    .where(eq(profileState.id, 1))
    .run();

  return {
    ...profile,
    meters,
    streakDays: streak.streakDays,
    longestStreak: streak.longestStreak,
    bestCombo,
    lastSessionDate: today,
  };
}
