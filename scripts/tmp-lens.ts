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
  const correct = p.choices.find((c: any) => c.id === p.correctId);
  const others = p.choices.filter((c: any) => c.id !== p.correctId);
  const cl = correct.text.length;
  const maxO = Math.max(...others.map((c: any) => c.text.length));
  const minO = Math.min(...others.map((c: any) => c.text.length));
  const meanO = others.reduce((s: number, c: any) => s + c.text.length, 0) / others.length;
  letters[p.correctId] = (letters[p.correctId] ?? 0) + 1;
  const isLong = cl >= maxO;
  const isShort = cl <= minO;
  if (isLong) longest += 1;
  if (isShort) shortest += 1;
  const flag = isLong ? 'LONGEST' : isShort ? 'shortest' : '';
  const ratio = cl / meanO;
  const spread = Math.max(cl, maxO) / Math.min(cl, minO);
  if (isLong || ratio > 1.3 || spread > 1.4) {
    console.log(
      `${item.id.padEnd(44)} ${p.correctId} len=${String(cl).padStart(3)} others=${others
        .map((c: any) => c.text.length)
        .join(',')} ratio=${ratio.toFixed(2)} spread=${spread.toFixed(2)} ${flag}`,
    );
  }
}
console.log(
  `\n${prefix}: mcq=${n} longest=${longest} (${Math.round((longest / n) * 100)}%) shortest=${shortest} letters=${JSON.stringify(letters)}`,
);
