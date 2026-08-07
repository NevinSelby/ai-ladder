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

export interface BiasReport {
  mcq: number;
  longestCorrect: number;
  rate: number;
  offenders: { id: string; correctLen: number; meanOther: number; ratio: number }[];
}

export function analyze(items: ContentItem[] = SEED_ITEMS): BiasReport {
  let mcq = 0;
  let longestCorrect = 0;
  const offenders: BiasReport['offenders'] = [];

  for (const item of items) {
    const payload = item.payload as { kind?: string; choices?: { id: string; text: string }[]; correctId?: string };
    if (payload?.kind !== 'mcq' || !payload.choices || !payload.correctId) continue;
    mcq += 1;

    const correct = payload.choices.find((c) => c.id === payload.correctId);
    const others = payload.choices.filter((c) => c.id !== payload.correctId);
    if (!correct || others.length === 0) continue;

    const correctLen = correct.text.length;
    const maxOther = Math.max(...others.map((c) => c.text.length));
    if (correctLen >= maxOther) longestCorrect += 1;

    const meanOther = others.reduce((sum, c) => sum + c.text.length, 0) / others.length;
    const ratio = correctLen / Math.max(meanOther, 1);
    if (ratio > MAX_LENGTH_RATIO) {
      offenders.push({ id: item.id, correctLen, meanOther: Math.round(meanOther), ratio });
    }
  }

  return { mcq, longestCorrect, rate: mcq ? longestCorrect / mcq : 0, offenders };
}

if (require.main === module) {
  const filter = process.argv[2];
  const items = filter
    ? SEED_ITEMS.filter((i) => i.id.startsWith(filter))
    : SEED_ITEMS;

  const report = analyze(items);
  const pct = Math.round(report.rate * 100);
  console.log(`\n  MCQ items          ${report.mcq}`);
  console.log(`  Longest is correct ${report.longestCorrect} (${pct}%)  target under ${MAX_LONGEST_RATE * 100}%`);
  console.log(`  Over-long answers  ${report.offenders.length} (correct answer >${MAX_LENGTH_RATIO}x the mean distractor)`);

  if (report.offenders.length > 0) {
    console.log('\n  Worst offenders:');
    for (const o of [...report.offenders].sort((a, b) => b.ratio - a.ratio).slice(0, 15)) {
      console.log(`    ${o.id.padEnd(34)} ${o.correctLen} vs ${o.meanOther} chars  (${o.ratio.toFixed(2)}x)`);
    }
  }

  if (report.rate > MAX_LONGEST_RATE) {
    console.error(`\n  ✗ The bank is beatable by shape: ${pct}% of answers are the longest option.\n`);
    process.exit(1);
  }
  console.log('\n  ✓ Answer length carries no signal.\n');
}
