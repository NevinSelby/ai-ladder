import { desc, gte } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { contentItems } from '@/db/schema';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * What changed this week.
 *
 * Reads the content bank's own `updatedAt` cursor, which the nightly pipeline
 * stamps when it publishes. Until that pipeline is deployed this reports the
 * bundled seed refresh, which is honest: something did change, and it was a
 * release rather than a source update.
 *
 * The point is a reason to open the app that is not the streak. A curriculum
 * that visibly moves is worth checking; one that never changes is a PDF.
 */
export interface ContentChange {
  id: string;
  mode: string;
  topics: string[];
  updatedAt: string;
  origin: string;
}

export async function recentChanges(
  db: Database,
  withinDays = 7,
  limit = 8
): Promise<{ items: ContentChange[]; total: number; since: string }> {
  const since = new Date(Date.now() - withinDays * 86_400_000).toISOString();

  const rows = await db
    .select()
    .from(contentItems)
    .where(gte(contentItems.updatedAt, since))
    .orderBy(desc(contentItems.updatedAt))
    .limit(200);

  const items = rows.slice(0, limit).map((row) => ({
    id: row.id,
    mode: row.mode,
    topics: (row.nodeIds ?? [])
      .map((nodeId) => TAXONOMY_BY_ID[nodeId]?.label)
      .filter((label): label is string => Boolean(label)),
    updatedAt: row.updatedAt,
    origin: row.origin,
  }));

  return { items, total: rows.length, since };
}
