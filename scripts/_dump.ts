import { SEED_ITEMS } from '../src/content/seed';
const prefix = process.argv[2];
let n=0;
for (const item of SEED_ITEMS) {
  if (!item.id.startsWith(prefix)) continue;
  const p = item.payload as any;
  if (p?.kind !== 'mcq') continue;
  n++;
  const correct = p.choices.find((c:any)=>c.id===p.correctId);
  const lens = p.choices.map((c:any)=>`${c.id}${c.id===p.correctId?'*':''}=${c.text.length}`).join(' ');
  const maxOther = Math.max(...p.choices.filter((c:any)=>c.id!==p.correctId).map((c:any)=>c.text.length));
  console.log(`${item.id.padEnd(32)} ${p.correctId}  ${correct.text.length>=maxOther?'LONGEST':'ok     '}  ${lens}`);
}
console.error(`total mcq ${n}`);
