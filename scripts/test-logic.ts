/**
 * Logic checks for the parts that decide whether the app is honest: scoring,
 * scheduling, streaks and the level-gating rule.
 *
 * Deliberately dependency-free so it runs anywhere:
 *   npm run test:logic
 */

import { multiSelectScore, orderingScore, scoreDrill, scoreNapkin } from '../shared/scoring';
import {
  crossedMilestone,
  dailyBonusPoints,
  DIFFICULTY_META,
  difficultyLabel,
  drillMinutes,
  xpOnOffer,
  comboMultiplier,
  currentLevel,
  goalSize,
  LEVELS,
  levelProgress,
  MAX_COMBO_MULTIPLIER,
  shadowLevel,
  streakMultiplier,
  ZERO_METERS,
} from '../shared/progression';
import { intervalDays, newState, ratingFromAttempt, retrievability, review } from '../shared/srs';
import { nextStreak, type Profile } from '../src/data/profile';
import { questsForDay } from '../src/data/quests';
import { meterForNodes } from '../shared/taxonomy';
import {
  CORRECT_COOLDOWN_DAYS,
  WRONG_COOLDOWN_DAYS,
  onCooldown,
} from '../src/data/session';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${name}${detail ? `, ${detail}` : ''}`);
  }
}

function near(a: number, b: number, tolerance = 1e-6) {
  return Math.abs(a - b) <= tolerance;
}

// ── Scoring ────────────────────────────────────────────────────────────────

check('mcq correct scores 1', scoreDrill(
  { kind: 'mcq', stem: 'x'.repeat(10), choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }, { id: 'c', text: 'c' }], correctId: 'b' },
  { kind: 'mcq', choiceId: 'b' }
).score === 1);

check('mcq wrong scores 0', scoreDrill(
  { kind: 'mcq', stem: 'x'.repeat(10), choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }, { id: 'c', text: 'c' }], correctId: 'b' },
  { kind: 'mcq', choiceId: 'a' }
).score === 0);

check('mismatched response kind does not throw', scoreDrill(
  { kind: 'mcq', stem: 'x'.repeat(10), choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }, { id: 'c', text: 'c' }], correctId: 'b' },
  { kind: 'order', sequence: ['a'] }
).score === 0);

// Selecting everything must not score full marks, otherwise multi-select
// stops measuring discrimination.
check('select-all is penalised', multiSelectScore(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c']) < 1,
  `got ${multiSelectScore(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c'])}`);
check('exact multi-select is full marks', multiSelectScore(['a', 'b', 'c'], ['a', 'b', 'c']) === 1);
check('multi-select never goes negative', multiSelectScore(['x', 'y', 'z', 'w'], ['a']) === 0);
check('partial multi-select gets partial credit', near(multiSelectScore(['a', 'b'], ['a', 'b', 'c']), 2 / 3));

check('perfect ordering scores 1', orderingScore(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']) === 1);
check('reversed ordering scores 0', orderingScore(['d', 'c', 'b', 'a'], ['a', 'b', 'c', 'd']) === 0);
// A single adjacent swap should cost one pair out of six, not half the marks.
check('one transposition is a small penalty',
  near(orderingScore(['b', 'a', 'c', 'd'], ['a', 'b', 'c', 'd']), 5 / 6),
  `got ${orderingScore(['b', 'a', 'c', 'd'], ['a', 'b', 'c', 'd'])}`);

check('napkin inside tolerance passes', scoreNapkin(1100, 1000, 0.25).correct);
check('napkin outside tolerance fails', !scoreNapkin(1400, 1000, 0.25).correct);
check('napkin handles NaN', !scoreNapkin(Number.NaN, 1000, 0.25).correct);

// ── FSRS ───────────────────────────────────────────────────────────────────

const now = new Date('2026-07-31T09:00:00Z');
const fresh = newState(now);
check('new state is due immediately', new Date(fresh.due).getTime() <= now.getTime());

const good = review(fresh, 3, now);
check('first good review sets stability', good.stability > 0);
check('first good review schedules ahead', new Date(good.due).getTime() > now.getTime());
check('reps increments', good.reps === 1);

const easy = review(fresh, 4, now);
check('easy schedules further out than good', new Date(easy.due).getTime() > new Date(good.due).getTime());

const again = review(fresh, 1, now);
check('again counts a lapse', again.lapses === 1);
check('again schedules sooner than good', new Date(again.due).getTime() < new Date(good.due).getTime());

// A lapse after a long, stable memory must shorten the interval sharply, 
// otherwise forgetting something carries no scheduling consequence.
const mature = { stability: 60, difficulty: 5, lastReview: '2026-06-01T09:00:00Z', due: '2026-08-01T09:00:00Z', reps: 8, lapses: 0 };
const lapsed = review(mature, 1, now);
check('lapse collapses stability', lapsed.stability < mature.stability / 2,
  `${mature.stability} -> ${lapsed.stability.toFixed(2)}`);
check('lapse increments lapses', lapsed.lapses === 1);

const recalled = review(mature, 3, now);
check('successful recall grows stability', recalled.stability > mature.stability,
  `${mature.stability} -> ${recalled.stability.toFixed(2)}`);

check('retrievability decays', retrievability(0, 10) > retrievability(30, 10));
check('retrievability at zero elapsed is 1', near(retrievability(0, 10), 1));
check('interval is at least a day', intervalDays(0.1) >= 1);
check('higher stability means longer interval', intervalDays(100) > intervalDays(10));

check('fast correct rates easy', ratingFromAttempt(true, 5_000, 20_000) === 4);
check('slow correct rates hard', ratingFromAttempt(true, 40_000, 20_000) === 2);
check('normal correct rates good', ratingFromAttempt(true, 18_000, 20_000) === 3);
check('incorrect always rates again', ratingFromAttempt(false, 1_000, 20_000) === 1);

// ── Progression: the gating rule ───────────────────────────────────────────

check('empty meters start at Intern', currentLevel(ZERO_METERS).index === 0);

// The whole point of the design: grinding one meter must not buy a level.
const lopsided = { depth: 50_000, platform: 0, aiCraft: 0, client: 0, scope: 0 };
check('one maxed meter does not level you up', currentLevel(lopsided).index === 0);
check('shadow level shows what you would have had', shadowLevel(lopsided).index === LEVELS.length - 1);
check('gating names the weakest meter', ['platform', 'aiCraft', 'client', 'scope'].includes(levelProgress(lopsided).blockedBy));

const balanced = { depth: 500, platform: 500, aiCraft: 500, client: 500, scope: 500 };
check('balanced meters level up', currentLevel(balanced).index === 2, `got ${currentLevel(balanced).title}`);
check('progress fraction is within bounds',
  levelProgress(balanced).fraction >= 0 && levelProgress(balanced).fraction <= 1);
check('deficit points at the next threshold',
  levelProgress(balanced).deficit === LEVELS[3].threshold - 500);

check('no streak means no multiplier', streakMultiplier(0) === 1);
check('long streak is capped', streakMultiplier(365) === streakMultiplier(30));
check('streak multiplier is monotonic',
  streakMultiplier(3) <= streakMultiplier(7) && streakMultiplier(7) <= streakMultiplier(14));

// ── Combo ──────────────────────────────────────────────────────────────────

check('no combo means no multiplier', comboMultiplier(0) === 1 && comboMultiplier(1) === 1);
check('combo grows', comboMultiplier(3) > comboMultiplier(2));
// Uncapped, a long chain would make the last question worth several times the
// first. Which punishes practicing the topics you are worst at.
check('combo is capped at 1.5x', comboMultiplier(50) === MAX_COMBO_MULTIPLIER);
check('combo never exceeds the cap', [2, 5, 10, 20, 100].every((c) => comboMultiplier(c) <= MAX_COMBO_MULTIPLIER));

// ── Difficulty and XP ──────────────────────────────────────────────────────

check('difficulty ranks ascend', 
  DIFFICULTY_META.intro.rank < DIFFICULTY_META.core.rank &&
  DIFFICULTY_META.core.rank < DIFFICULTY_META.deep.rank &&
  DIFFICULTY_META.deep.rank < DIFFICULTY_META.edge.rank);
// The whole point of the tags: harder must pay more, strictly.
check('harder questions pay strictly more XP',
  xpOnOffer('drill', 'intro') < xpOnOffer('drill', 'core') &&
  xpOnOffer('drill', 'core') < xpOnOffer('drill', 'deep') &&
  xpOnOffer('drill', 'deep') < xpOnOffer('drill', 'edge'));
check('expert pays at least 3x easy', xpOnOffer('drill', 'edge') >= xpOnOffer('drill', 'intro') * 3);
check('unknown difficulty falls back to medium',
  difficultyLabel('nonsense') === 'Medium' && xpOnOffer('drill', 'nonsense') === xpOnOffer('drill', 'core'));
check('every content difficulty has a label',
  ['intro', 'core', 'deep', 'edge'].every((d) => Boolean(DIFFICULTY_META[d]?.label)));

check('goal sizes are distinct',
  goalSize('casual') < goalSize('regular') && goalSize('regular') < goalSize('intense'));
check('unknown goal falls back to regular', goalSize('nonsense') === goalSize('regular'));
check('null goal falls back to regular', goalSize(null) === goalSize('regular'));

// ── Streaks ────────────────────────────────────────────────────────────────

const base: Profile = {
  meters: ZERO_METERS,
  streakDays: 5,
  longestStreak: 9,
  bestCombo: 0,
  points: 0,
  dailyGoal: 'regular',
  displayName: null,
  hapticsEnabled: true,
  lastSessionDate: '2026-07-30',
  remoteUserId: null,
};

check('consecutive day extends', nextStreak(base, '2026-07-31').streakDays === 6);
check('same day does not extend', nextStreak(base, '2026-07-30').streakDays === 5);
check('same day is flagged as not extended', nextStreak(base, '2026-07-30').extended === false);
check('a missed day resets to one', nextStreak(base, '2026-08-02').streakDays === 1);
check('longest streak is preserved on reset', nextStreak(base, '2026-08-02').longestStreak === 9);
check('longest streak updates when beaten',
  nextStreak({ ...base, streakDays: 9 }, '2026-07-31').longestStreak === 10);
check('first ever session starts at one',
  nextStreak({ ...base, streakDays: 0, longestStreak: 0, lastSessionDate: null }).streakDays === 1);
// Month and year boundaries are where naive date maths breaks.
check('month boundary is consecutive',
  nextStreak({ ...base, lastSessionDate: '2026-07-31' }, '2026-08-01').streakDays === 6);
check('year boundary is consecutive',
  nextStreak({ ...base, lastSessionDate: '2025-12-31' }, '2026-01-01').streakDays === 6);

// ── Meter routing ──────────────────────────────────────────────────────────

check('routes to the dominant meter', meterForNodes(['cust.bad_news', 'cust.ownership', 'gcp.iam']) === 'client');
check('single node routes to its meter', meterForNodes(['ai.evals']) === 'aiCraft');
check('unknown nodes fall back safely', typeof meterForNodes(['nope.nope']) === 'string');

// ── Session length and daily rewards ───────────────────────────────────────

check('casual drill is shorter than regular', drillMinutes('casual') < drillMinutes('regular'));
check('regular drill is shorter than intense', drillMinutes('regular') < drillMinutes('intense'));
check('unknown goal still yields at least a minute', drillMinutes(null) >= 1);
check('daily chest grows with the streak', dailyBonusPoints(10) > dailyBonusPoints(2));
check('daily bonus never negative on day zero', dailyBonusPoints(0) === 10);
check('daily bonus caps at 40', dailyBonusPoints(500) === 40 && dailyBonusPoints(15) === 40);
check('crossing 7 fires the 7-day milestone', crossedMilestone(6, 7) === 7);
check('staying past a milestone does not re-fire', crossedMilestone(7, 8) === null);
check('a jump across several fires the highest', crossedMilestone(2, 20) === 14);
check('reset to one fires nothing', crossedMilestone(9, 1) === null);

// ── Daily quests ───────────────────────────────────────────────────────────

const questsA = questsForDay('2026-08-04');
const questsB = questsForDay('2026-08-04');
const questsC = questsForDay('2026-08-05');
check('three quests every day', questsA.length === 3 && questsC.length === 3);
check('completing a session is always the anchor quest', questsA[0].id === 'session');
check('same day yields the same quests', questsA.map((q) => q.id).join() === questsB.map((q) => q.id).join());
check('no duplicate quests in a day', new Set(questsA.map((q) => q.id)).size === 3);
check('the rotation changes across days',
  ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']
    .map((d) => questsForDay(d).map((q) => q.id).join())
    .some((ids, _, all) => ids !== all[0]));
check('every quest pays points', questsA.every((q) => q.points > 0));

// ── Question rotation ──────────────────────────────────────────────────────
// The repeat bug: a question answered correctly must stay out of rotation.

const HOUR = 3600_000;
const nowRef = new Date('2026-08-04T12:00:00Z');
const ago = (ms: number) => ({ lastSeen: nowRef.getTime() - ms, lastScore: 1 });

check('a correct answer an hour ago is on cooldown', onCooldown(ago(HOUR), nowRef));
check('a correct answer 3 days ago is still on cooldown', onCooldown(ago(72 * HOUR), nowRef));
check('a correct answer 11 days ago is back in rotation',
  !onCooldown(ago(11 * 24 * HOUR), nowRef));
check('a wrong answer an hour ago is on cooldown',
  onCooldown({ lastSeen: nowRef.getTime() - HOUR, lastScore: 0 }, nowRef));
check('a wrong answer 2 days ago returns sooner than a correct one',
  !onCooldown({ lastSeen: nowRef.getTime() - 48 * HOUR, lastScore: 0 }, nowRef) &&
    onCooldown({ lastSeen: nowRef.getTime() - 48 * HOUR, lastScore: 1 }, nowRef));
check('a never-seen item is never on cooldown', !onCooldown(undefined, nowRef));
check('wrong answers return before correct ones', WRONG_COOLDOWN_DAYS < CORRECT_COOLDOWN_DAYS);

// ── Report ─────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`    ✗ ${failure}`);
  console.error('');
  process.exit(1);
}
console.log('  ✓ Logic checks pass.\n');
