/**
 * Remove em dashes without wrecking the prose.
 *
 * A blind replace produces comma splices and dangling fragments, which reads
 * worse than the dashes did. Em dashes get used three different ways here and
 * each needs a different repair:
 *
 *   1. Paired, as parentheses:  "the path (paired dashes) beats X"
 *      becomes commas, which is what the pair was standing in for.
 *   2. A label at the start:    "Practice, then a label"
 *      becomes a colon.
 *   3. A trailing elaboration:  "...mostly useless, then an elaboration"
 *      becomes a full stop when what follows can stand as a sentence, and a
 *      comma when it cannot.
 *
 * Run:  node scripts/dedash.mjs [--dry]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dry = process.argv.includes('--dry');

/** The character itself, by escape, so this file contains none literally. */
const DASH = '\u2014';
const RE = (pattern, flags) => new RegExp(pattern.replaceAll('DASH', DASH), flags);

const files = execSync(
  `grep -rl '${DASH}' src shared scripts supabase/functions 2>/dev/null || true`,
  { encoding: 'utf8' }
)
  .split('\n')
  .filter((f) => f && !f.endsWith('dedash.mjs'));

/** Words that almost always begin a fresh independent clause. */
const CLAUSE_START =
  /^(the|a|an|this|that|these|those|it|they|you|we|i|he|she|there|his|her|its|their|our|your|most|many|some|each|every|no|any|one|two|three|four|five|nothing|anything|everything|nobody|somebody|which|what|when|where|why|how|if|once|because|since|while|after|before|until|unless)\b/i;

/** A rough test for "this segment could stand alone as a sentence." */
function isIndependent(text) {
  const trimmed = text.trim();
  if (trimmed.length < 16) return false;
  if (!CLAUSE_START.test(trimmed)) return false;
  // Needs something verb-shaped to be a sentence rather than a noun phrase.
  return /\b(is|are|was|were|be|been|being|has|have|had|does|do|did|can|could|will|would|should|must|may|might|makes?|means?|gives?|takes?|keeps?|leaves?|comes?|goes?|needs?|wants?|works?|fails?|costs?|turns?|reads?|sits?|stays?|becomes?|happens?|matters?|counts?|breaks?|stops?|starts?|holds?|runs?|shows?|tells?|puts?|gets?)\b/i.test(
    trimmed
  );
}

function capitalize(text) {
  const i = text.search(/\S/);
  if (i < 0) return text;
  return text.slice(0, i) + text[i].toUpperCase() + text.slice(i + 1);
}

/** Repair one line. */
function fixLine(line) {
  if (!line.includes(DASH)) return line;

  // 1. paired dashes inside a single segment become commas.
  //     Guard: both dashes must be spaced, and the middle kept short enough to
  //     genuinely be an aside.
  line = line.replace(RE(' DASH ([^DASH]{3,90}?) DASH ', 'g'), (m, inner) => `, ${inner}, `);

  // 2. a label at the very start of a string or comment becomes a colon.
  line = line.replace(
    RE("((?:'|\"|`|\\/\\*\\*|\\*|\\/\\/)\\s*[A-Z][A-Za-z0-9 /&'-]{1,28}) DASH ", 'g'),
    (m, head) => `${head}: `
  );

  // 3. everything left: full stop when the tail stands alone, comma otherwise.
  line = line.replace(RE(' DASH (.+?)(?=$|[\'"`])', 'g'), (m, tail) => {
    // Don't split when the tail is really a list continuation.
    if (/^(and|or|but|so|yet|nor)\b/i.test(tail.trim())) return `, ${tail}`;
    if (isIndependent(tail)) return `. ${capitalize(tail)}`;
    return `, ${tail}`;
  });

  // Any stragglers (odd spacing, start of line).
  line = line.replace(RE('\\s*DASH\\s*', 'g'), ', ');

  // Tidy artifacts the rules can produce.
  line = line
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*'/g, "'")
    .replace(/\s+,/g, ',')
    .replace(/([a-z]),\s*([A-Z][a-z]+ (is|are|was|were|has|have|will|can|does))/g, '$1. $2');

  return line;
}

let changed = 0;
let dashesBefore = 0;
const samples = [];

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  dashesBefore += (original.match(RE('DASH', 'g')) ?? []).length;
  const fixed = original.split('\n').map(fixLine).join('\n');
  if (fixed !== original) {
    changed += 1;
    if (!dry) writeFileSync(file, fixed);
    if (samples.length < 12) {
      const before = original.split('\n').find((l) => l.includes(DASH));
      const idx = original.split('\n').indexOf(before);
      samples.push({ file, before: before?.trim(), after: fixed.split('\n')[idx]?.trim() });
    }
  }
}

console.log(`\n  ${dashesBefore} em dashes across ${files.length} files`);
console.log(`  ${changed} files ${dry ? 'would change' : 'rewritten'}\n`);
for (const s of samples) {
  console.log(`  ${s.file}`);
  console.log(`    before  ${s.before?.slice(0, 118)}`);
  console.log(`    after   ${s.after?.slice(0, 118)}\n`);
}
