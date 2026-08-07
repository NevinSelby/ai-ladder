/**
 * Answer-shape bias detector.
 *
 * A multiple-choice bank is worthless if the answer can be found without
 * reading the question. The classic tell is length: authors write a full,
 * careful correct answer and three terse distractors, so "pick the longest"
 * scores far above chance. This bank was at 98%.
 *
 * Run over one file or the whole bank:
 *   npx tsx scripts/check-bias.ts                     # everything
 *   npx tsx scripts/check-bias.ts src/content/seed/drill-field.ts
 *
 * Exits non-zero when a file is outside tolerance, so it can gate a commit.
 */

import { SEED_ITEMS } from '../src/content/seed';
import type { ContentItem } from '../shared/content';

/** Longest-is-correct rate above this is a bank you can beat by shape alone. */
const MAX_LONGEST_RATE = 0.4;
/** A correct answer more than this much longer than the mean is a giveaway. */
const MAX_LENGTH_RATIO = 1.35;
/**
 * Share of correct answers allowed to sit on any single option letter.
 *
 * Length was not the only exploitable shape. Two files had 100% of their
 * answers on option A, and the bank as a whole sat at 53%, so "always pick A"
 * outperformed studying. With four options, chance is 25%; this allows drift
 * without allowing a strategy.
 */
const MAX_LETTER_SHARE = 0.4;

export interface BiasReport {
  mcq: number;
  longestCorrect: number;
  shortestCorrect: number;
  rate: number;
  shortestRate: number;
  offenders: { id: string; correctLen: number; meanOther: number; ratio: number }[];
  /** Count of correct answers per option id. */
  letters: Map<string, number>;
  /** Share held by the most common option id. */
  topLetterShare: number;
}

export function analyze(items: ContentItem[] = SEED_ITEMS): BiasReport {
  let mcq = 0;
  let longestCorrect = 0;
  let shortestCorrect = 0;
  const offenders: BiasReport['offenders'] = [];
  const letters = new Map<string, number>();

  for (const item of items) {
    const payload = item.payload as { kind?: string; choices?: { id: string; text: string }[]; correctId?: string };
    if (payload?.kind !== 'mcq' || !payload.choices || !payload.correctId) continue;
    mcq += 1;

    letters.set(payload.correctId, (letters.get(payload.correctId) ?? 0) + 1);

    const correct = payload.choices.find((c) => c.id === payload.correctId);
    const others = payload.choices.filter((c) => c.id !== payload.correctId);
    if (!correct || others.length === 0) continue;

    const correctLen = correct.text.length;
    const maxOther = Math.max(...others.map((c) => c.text.length));
    const minOther = Math.min(...others.map((c) => c.text.length));
    if (correctLen >= maxOther) longestCorrect += 1;
    // The inverse exploit. Trimming correct answers to fix "always the longest"
    // lands on "always the shortest" if nobody is watching, which is exactly as
    // beatable.
    if (correctLen <= minOther) shortestCorrect += 1;

    const meanOther = others.reduce((sum, c) => sum + c.text.length, 0) / others.length;
    const ratio = correctLen / Math.max(meanOther, 1);
    if (ratio > MAX_LENGTH_RATIO) {
      offenders.push({ id: item.id, correctLen, meanOther: Math.round(meanOther), ratio });
    }
  }

  const topLetter = Math.max(0, ...letters.values());
  return {
    mcq,
    longestCorrect,
    shortestCorrect,
    rate: mcq ? longestCorrect / mcq : 0,
    shortestRate: mcq ? shortestCorrect / mcq : 0,
    offenders,
    letters,
    topLetterShare: mcq ? topLetter / mcq : 0,
  };
}

if (require.main === module) {
  const filter = process.argv[2];
  const items = filter
    ? SEED_ITEMS.filter((i) => i.id.startsWith(filter))
    : SEED_ITEMS;

  const report = analyze(items);
  const pct = Math.round(report.rate * 100);
  console.log(`\n  MCQ items          ${report.mcq}`);
  const shortPct = Math.round(report.shortestRate * 100);
  console.log(`  Longest is correct ${report.longestCorrect} (${pct}%)  target under ${MAX_LONGEST_RATE * 100}%`);
  console.log(`  Shortest is correct ${report.shortestCorrect} (${shortPct}%)  target under ${MAX_LONGEST_RATE * 100}%`);
  console.log(`  Over-long answers  ${report.offenders.length} (correct answer >${MAX_LENGTH_RATIO}x the mean distractor)`);

  if (report.offenders.length > 0) {
    console.log('\n  Worst offenders:');
    for (const o of [...report.offenders].sort((a, b) => b.ratio - a.ratio).slice(0, 15)) {
      console.log(`    ${o.id.padEnd(34)} ${o.correctLen} vs ${o.meanOther} chars  (${o.ratio.toFixed(2)}x)`);
    }
  }

  const letterPct = Math.round(report.topLetterShare * 100);
  const spread = [...report.letters].sort().map(([k, v]) => `${k}:${v}`).join('  ');
  console.log(`  Correct letter     ${spread}   top ${letterPct}%  target under ${MAX_LETTER_SHARE * 100}%`);

  let failed = false;
  if (report.rate > MAX_LONGEST_RATE) {
    console.error(`\n  ✗ Beatable by length: ${pct}% of correct answers are the longest option.`);
    failed = true;
  }
  if (report.shortestRate > MAX_LONGEST_RATE) {
    console.error(`  ✗ Beatable by length inverted: ${shortPct}% of correct answers are the shortest option.`);
    failed = true;
  }
  if (report.topLetterShare > MAX_LETTER_SHARE) {
    console.error(`  ✗ Beatable by position: ${letterPct}% of correct answers sit on one option.`);
    failed = true;
  }
  if (failed) {
    console.error('');
    process.exit(1);
  }
  console.log('\n  ✓ Neither answer length nor position carries signal.\n');
}
