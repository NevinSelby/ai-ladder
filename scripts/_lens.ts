import { SEED_ITEMS } from '../src/content/seed';

const prefix = process.argv[2] ?? '';
let longest = 0;
let shortest = 0;
let n = 0;
const letters: Record<string, number> = {};
for (const item of SEED_ITEMS) {
  if (!item.id.startsWith(prefix)) continue;
  const p = item.payload as any;
  if (p?.kind !== 'mcq') continue;
  n += 1;
  letters[p.correctId] = (letters[p.correctId] ?? 0) + 1;
  const lens: Record<string, number> = {};
  for (const c of p.choices) lens[c.id] = c.text.length;
  const cl = lens[p.correctId];
  const others = p.choices.filter((c: any) => c.id !== p.correctId).map((c: any) => c.text.length);
  const isLongest = cl >= Math.max(...others);
  const isShortest = cl <= Math.min(...others);
  if (isLongest) longest += 1;
  if (isShortest) shortest += 1;
  const flag = isLongest ? ' <<LONGEST' : isShortest ? ' (short)' : '';
  console.log(
    `${item.id.padEnd(30)} correct=${p.correctId} ` +
      p.choices.map((c: any) => `${c.id}:${String(c.text.length).padStart(3)}`).join(' ') + flag
  );
}
console.log(`\n  ${n} mcq | longest-correct ${longest} (${Math.round((longest / n) * 100)}%) | shortest-correct ${shortest} (${Math.round((shortest / n) * 100)}%)`);
console.log(`  letters: ${JSON.stringify(letters)}`);
