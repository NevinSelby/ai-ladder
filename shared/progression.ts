/**
 * Craft meters and the career ladder.
 *
 * The mechanic that separates this from a flashcard app: your level is gated by
 * your *weakest* meter, not by total XP. You cannot grind multiple-choice
 * questions to Principal Architect while never once sitting in a simulated room
 * with an angry CTO. Which is exactly the failure mode of every other practice
 * app, and exactly the skill split the real interview loop screens for.
 */

import type { MeterKey } from './taxonomy';

export const METER_ORDER: MeterKey[] = ['depth', 'platform', 'aiCraft', 'client', 'scope'];

export type Meters = Record<MeterKey, number>;

export const ZERO_METERS: Meters = {
  depth: 0,
  platform: 0,
  aiCraft: 0,
  client: 0,
  scope: 0,
};

export interface Level {
  index: number;
  title: string;
  /** XP required in *every* meter to hold this level. */
  threshold: number;
  /** One line shown when you reach it. */
  note: string;
}

export const LEVELS: Level[] = [
  { index: 0, title: 'Intern', threshold: 0, note: 'Everyone starts by reading the runbook.' },
  { index: 1, title: 'Associate FDE', threshold: 150, note: 'You can be trusted alone in a working session.' },
  { index: 2, title: 'Forward Deployed Engineer', threshold: 450, note: 'You own an account workstream end to end.' },
  { index: 3, title: 'Senior FDE', threshold: 1_000, note: 'You scope the engagement before anyone writes code.' },
  { index: 4, title: 'Staff FDE', threshold: 2_000, note: 'You are the one they send when it is going badly.' },
  { index: 5, title: 'Solutions Architect', threshold: 3_600, note: 'You shape the deal, not just the delivery.' },
  { index: 6, title: 'Principal Architect', threshold: 6_000, note: 'Your reference designs outlive your engagements.' },
  { index: 7, title: 'Field CTO', threshold: 10_000, note: 'You set what the field builds. Rare air.' },
];

/** The level you actually hold, gated on the weakest meter. */
export function currentLevel(meters: Meters): Level {
  const weakest = Math.min(...METER_ORDER.map((key) => meters[key]));
  let level = LEVELS[0];
  for (const candidate of LEVELS) {
    if (weakest >= candidate.threshold) level = candidate;
  }
  return level;
}

/** The level total XP alone would buy, used to show what your weak meter costs you. */
export function shadowLevel(meters: Meters): Level {
  const best = Math.max(...METER_ORDER.map((key) => meters[key]));
  let level = LEVELS[0];
  for (const candidate of LEVELS) {
    if (best >= candidate.threshold) level = candidate;
  }
  return level;
}

export interface LevelProgress {
  level: Level;
  next: Level | null;
  /** 0..1 toward the next level, measured on the weakest meter. */
  fraction: number;
  /** The meter currently holding you back. */
  blockedBy: MeterKey;
  /** XP still needed in that meter. */
  deficit: number;
}

export function levelProgress(meters: Meters): LevelProgress {
  const level = currentLevel(meters);
  const next = LEVELS[level.index + 1] ?? null;
  const blockedBy = METER_ORDER.reduce((weakest, key) =>
    meters[key] < meters[weakest] ? key : weakest
  );
  const weakestXp = meters[blockedBy];

  if (!next) {
    return { level, next: null, fraction: 1, blockedBy, deficit: 0 };
  }
  const span = next.threshold - level.threshold;
  const gained = weakestXp - level.threshold;
  return {
    level,
    next,
    fraction: span > 0 ? Math.max(0, Math.min(1, gained / span)) : 1,
    blockedBy,
    deficit: Math.max(0, next.threshold - weakestXp),
  };
}

/** Where a meter sits on the whole ladder, 0..1. Drives the meter bars. */
export function meterFraction(xp: number): number {
  const top = LEVELS[LEVELS.length - 1].threshold;
  // Compress the top end so early progress is visible without the bar looking
  // finished after one week.
  return Math.max(0, Math.min(1, Math.sqrt(xp / top)));
}

// ── XP awards ──────────────────────────────────────────────────────────────

/**
 * Difficulty, as the user sees it.
 *
 * The content tiers are named intro/core/deep/edge internally because that is
 * how they were authored, but those words mean nothing to a reader mid-session.
 * The labels below are the surface, and the multiplier is shown alongside so the
 * reward is legible *before* answering, an XP number that only appears
 * afterwards cannot influence which question you choose to attempt.
 */
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  intro: 0.7,
  core: 1,
  deep: 1.6,
  edge: 2.4,
};

export const DIFFICULTY_META: Record<
  string,
  { label: string; short: string; blurb: string; rank: number }
> = {
  intro: {
    label: 'Easy',
    short: 'E',
    blurb: 'A fundamental you should be able to answer cold.',
    rank: 1,
  },
  core: {
    label: 'Medium',
    short: 'M',
    blurb: 'The working knowledge the role assumes.',
    rank: 2,
  },
  deep: {
    label: 'Hard',
    short: 'H',
    blurb: 'Requires reasoning about a trade-off, not recall.',
    rank: 3,
  },
  edge: {
    label: 'Expert',
    short: 'X',
    blurb: 'The case that separates people who have actually shipped this.',
    rank: 4,
  },
};

export function difficultyLabel(difficulty: string): string {
  return DIFFICULTY_META[difficulty]?.label ?? 'Medium';
}

/** XP on offer for a perfect answer, shown before the user commits. */
export function xpOnOffer(mode: string, difficulty: string): number {
  return Math.round((BASE_XP[mode] ?? 10) * (DIFFICULTY_MULTIPLIER[difficulty] ?? 1));
}

/** Base XP for a fully correct attempt, before the difficulty multiplier. */
export const BASE_XP: Record<string, number> = {
  drill: 12,
  arena: 18,
  napkin: 22,
  incident: 45,
  evallab: 70,
  blueprint: 80,
  discovery: 55,
  room: 90,
  decompose: 110,
};

/**
 * XP for one attempt.
 * @param score 0.1, partial credit is the norm for the judgment modes.
 */
export function awardXp(mode: string, difficulty: string, score: number): number {
  const base = BASE_XP[mode] ?? 10;
  const mult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;
  return Math.round(base * mult * Math.max(0, Math.min(1, score)));
}

/**
 * Streak multiplier, capped so a long streak is a reward rather than a source of
 * anxiety about losing 3x progress.
 */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 1.5;
  if (streakDays >= 14) return 1.35;
  if (streakDays >= 7) return 1.2;
  if (streakDays >= 3) return 1.1;
  return 1;
}

/**
 * Combo multiplier: consecutive fully-correct answers within one session.
 *
 * Capped at 1.5x, and it resets on any answer that is not fully correct. The cap
 * matters: an uncapped combo makes the last question of a long streak worth more
 * than the first ten, which quietly punishes people for practicing the topics
 * they are weakest at.
 */
export const MAX_COMBO_MULTIPLIER = 1.5;

export function comboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + (combo - 1) * 0.1);
}

/** Session sizes, mirroring the "how much do you want to do today" choice. */
export const DAILY_GOALS = {
  casual: { label: 'Casual', items: 3, blurb: 'Three questions. Keeps the streak alive on a bad day.' },
  regular: { label: 'Regular', items: 5, blurb: 'Five questions. The default, about three minutes.' },
  intense: { label: 'Intense', items: 10, blurb: 'Ten questions. A proper session.' },
} as const;

export type DailyGoal = keyof typeof DAILY_GOALS;
export const DAILY_GOAL_KEYS = Object.keys(DAILY_GOALS) as DailyGoal[];

export function goalSize(goal: string | null | undefined): number {
  return DAILY_GOALS[(goal as DailyGoal) ?? 'regular']?.items ?? DAILY_GOALS.regular.items;
}

/**
 * Honest session-length estimates.
 *
 * A fixed "3 min" label was shown for every goal size, which made the goal
 * picker look cosmetic. Roughly 35 seconds per drill question (median observed
 * answer time plus reading the explanation), rounded to a whole minute so the
 * label reads as an estimate rather than a stopwatch promise.
 */
export function drillMinutes(goal: string | null | undefined): number {
  return Math.max(1, Math.round((goalSize(goal) * 35) / 60));
}

/** Five arena rounds against a sixty-second clock, plus reading field takes. */
export const ARENA_MINUTES = 5;

/**
 * The daily chest: points for the first session of each day, growing with the
 * streak and capped so a long streak is a comfort rather than a treadmill.
 * Deliberately points rather than XP: XP measures skill and gates levels, so
 * handing it out for showing up would debase the ladder. Points are the
 * habit's own currency, spending comes later.
 */
export function dailyBonusPoints(streakDays: number): number {
  return 10 + Math.min(Math.max(streakDays, 0), 15) * 2;
}

/** Streak lengths worth stopping to celebrate. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;

/** The milestone just crossed, or null. Fires only on the crossing itself. */
export function crossedMilestone(previous: number, next: number): number | null {
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i -= 1) {
    const milestone = STREAK_MILESTONES[i];
    if (previous < milestone && next >= milestone) return milestone;
  }
  return null;
}

export function applyAward(meters: Meters, meter: MeterKey, xp: number): Meters {
  return { ...meters, [meter]: meters[meter] + xp };
}
