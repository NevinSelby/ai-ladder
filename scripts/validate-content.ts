/**
 * Content gate.
 *
 * Runs the same validation the publish gate will run on generated items, against
 * the hand-authored seed bank. If the seed bank cannot pass, the bar is not real.
 *
 *   npm run validate:content
 */

import { MODES, type Mode } from '../shared/content';
import { DIAGRAM_IDS } from '../shared/diagrams';
import { LIVE_NODES, TAXONOMY } from '../shared/taxonomy';
import { LESSONS, LESSON_COVERED_NODES, checkLessons } from '../src/content/lessons';
import { SEED_ITEMS, validateSeed } from '../src/content/seed';
import { readSeconds } from '../shared/lessons';

const problems = validateSeed();

const byMode = new Map<Mode, number>();
for (const item of SEED_ITEMS) {
  byMode.set(item.mode, (byMode.get(item.mode) ?? 0) + 1);
}

const citedNodes = new Set(SEED_ITEMS.flatMap((item) => item.nodeIds));
const uncovered = LIVE_NODES.filter((node) => !citedNodes.has(node.id));

console.log(`\n  Taxonomy   ${TAXONOMY.length} nodes (${LIVE_NODES.length} live)`);
console.log(`  Seed bank  ${SEED_ITEMS.length} items`);
for (const mode of MODES) {
  const count = byMode.get(mode) ?? 0;
  if (count > 0) console.log(`             ${String(count).padStart(3)}  ${mode}`);
}
console.log(
  `  Coverage   ${citedNodes.size}/${LIVE_NODES.length} live nodes cited by at least one item`
);

const withDiagram = SEED_ITEMS.filter((item) => item.diagramId);
const usedDiagrams = new Set(withDiagram.map((item) => item.diagramId!));
console.log(
  `  Diagrams   ${withDiagram.length} items illustrated · ${usedDiagrams.size}/${DIAGRAM_IDS.length} diagrams in use`
);
const unusedDiagrams = DIAGRAM_IDS.filter((id) => !usedDiagrams.has(id));
if (unusedDiagrams.length > 0) {
  console.log(`             unused: ${unusedDiagrams.join(', ')}`);
}

if (uncovered.length > 0) {
  console.log(`\n  ${uncovered.length} live nodes have no content yet:`);
  for (const node of uncovered) console.log(`    · ${node.id.padEnd(24)} ${node.label}`);
}

/**
 * Duplicate detection.
 *
 * The schema cannot catch two authors writing the same question twice, and a
 * bank this size is written in parallel. Exact-stem and shared-opening checks
 * find both the copy and the near-copy.
 */
const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const byStem = new Map<string, string[]>();
const byOpening = new Map<string, string[]>();
for (const item of SEED_ITEMS) {
  const payload = item.payload as { stem?: string; situation?: string };
  const stem = payload.stem ?? payload.situation;
  if (!stem) continue;
  const full = normalize(stem);
  const opening = full.split(' ').slice(0, 9).join(' ');
  byStem.set(full, [...(byStem.get(full) ?? []), item.id]);
  byOpening.set(opening, [...(byOpening.get(opening) ?? []), item.id]);
}
const duplicates = [
  ...[...byStem.values()].filter((ids) => ids.length > 1).map((ids) => ['identical stem', ids] as const),
  ...[...byOpening.values()].filter((ids) => ids.length > 1).map((ids) => ['same opening', ids] as const),
];
console.log(`  Duplicates ${duplicates.length === 0 ? 'none' : `${duplicates.length} found`}`);

const lessonProblems = checkLessons();
const lessonSeconds = LESSONS.reduce((sum, lesson) => sum + readSeconds(lesson), 0);
console.log(
  `  Lessons    ${LESSONS.length} cards · ${Math.round(lessonSeconds / 60)} min total · ` +
    `${LESSON_COVERED_NODES.size}/${LIVE_NODES.length} nodes explained`
);

if (lessonProblems.length > 0) {
  console.error(`\n  \u2717 ${lessonProblems.length} lesson problem(s):\n`);
  for (const problem of lessonProblems) {
    console.error(`    ${problem.lessonId.padEnd(24)} ${problem.problem}`);
  }
  console.error('');
  process.exit(1);
}

if (duplicates.length > 0) {
  console.error(`\n  \u2717 ${duplicates.length} duplicate question(s):\n`);
  for (const [kind, ids] of duplicates) console.error(`    ${kind.padEnd(16)} ${ids.join(', ')}`);
  console.error('');
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`\n  ✗ ${problems.length} problem(s):\n`);
  for (const problem of problems) {
    console.error(`    ${problem.itemId.padEnd(30)} ${problem.problem}`);
  }
  console.error('');
  process.exit(1);
}

console.log('\n  ✓ Seed bank valid.\n');
