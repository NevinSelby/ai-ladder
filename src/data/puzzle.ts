import { eq } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { attempts, contentItems } from '@/db/schema';
import type { ContentItem, FlawItem } from '@shared/content';
import { ContentItemSchema } from '@shared/content';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

import { localDateKey, readProfile } from './profile';
import { matchesCloud } from './session';

/**
 * The daily puzzle.
 *
 * One item a day, the same one for everybody, chosen by the date rather than
 * by your history. That is the whole point: a shared puzzle is something you
 * can talk about, and a spaced-repetition queue is not, because nobody else
 * has your queue.
 *
 * The pick is a pure function of the day, so it needs no server and no state,
 * and two devices agree without syncing. It is deliberately outside the SRS
 * rotation: solving it does not disturb your schedule, and it never counts as
 * your daily session.
 */

/** Stable 32-bit hash. Same string in, same number out, on every platform. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface DailyPuzzle {
  item: FlawItem;
  day: string;
  /** Already solved today, so the UI can show the result instead of the puzzle. */
  solved: boolean;
  score: number | null;
}

/**
 * Today's puzzle, or null when the bank has nothing that fits.
 *
 * Cloud preference still applies: a shared puzzle that assumes a platform you
 * have never used is not shared, it is exclusionary.
 */
export async function dailyPuzzle(
  db: Database,
  today = localDateKey()
): Promise<DailyPuzzle | null> {
  const profile = await readProfile(db);
  const rows = await db.select().from(contentItems).where(eq(contentItems.mode, 'flaw'));

  const pool = rows
    .map((row) => {
      const parsed = ContentItemSchema.safeParse({
        id: row.id,
        mode: row.mode,
        nodeIds: row.nodeIds,
        difficulty: row.difficulty,
        explanation: row.explanation,
        diagramId: row.diagramId ?? undefined,
        citations: row.citations,
        payload: row.payload,
        origin: row.origin,
        criticScore: row.criticScore,
        verifiedAt: row.verifiedAt ?? undefined,
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((item): item is ContentItem => item !== null)
    .filter((item): item is FlawItem => item.mode === 'flaw')
    .filter((item) => item.nodeIds.every((id) => TAXONOMY_BY_ID[id]?.status === 'live'))
    .filter((item) => matchesCloud(item, profile.cloudPreference))
    // Sort by id so the pool order does not depend on database row order,
    // which would make the "same puzzle for everyone" promise a lie.
    .sort((a, b) => a.id.localeCompare(b.id));

  if (pool.length === 0) return null;

  const item = pool[hashString(today) % pool.length];
  const solvedRows = await db.select().from(attempts).where(eq(attempts.itemId, item.id));
  // createdAt is UTC; the puzzle day is the user's local day, so compare after
  // converting rather than slicing the ISO string.
  const todays = solvedRows.filter((row) => localDateKey(new Date(row.createdAt)) === today);

  return {
    item,
    day: today,
    solved: todays.length > 0,
    score: todays.length > 0 ? todays[0].score : null,
  };
}
