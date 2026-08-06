import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { attempts, contentItems, itemNodes, srsStates } from '@/db/schema';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

export interface TopicDetail {
  attempts: number;
  /** Mean score across every attempt touching this node, 0..1. */
  accuracy: number;
  /** How many questions in the bank cover it. */
  itemCount: number;
  suspended: boolean;
  due: string | null;
}

/**
 * Everything the topic page needs, for one node.
 *
 * The id is checked against the taxonomy before any query runs. Node ids come
 * from a URL, so treating one as trusted input would mean a hand-edited link
 * reaches the database; an unknown id returns empty rather than querying.
 */
export async function topicDetail(db: Database, nodeId: string): Promise<TopicDetail> {
  const empty: TopicDetail = {
    attempts: 0,
    accuracy: 0,
    itemCount: 0,
    suspended: false,
    due: null,
  };
  if (!TAXONOMY_BY_ID[nodeId]) return empty;

  const [stat] = await db
    .select({
      n: sql<number>`count(*)`,
      avg: sql<number>`avg(${attempts.score})`,
    })
    .from(attempts)
    .innerJoin(itemNodes, eq(attempts.itemId, itemNodes.itemId))
    .where(eq(itemNodes.nodeId, nodeId));

  const [items] = await db
    .select({ n: sql<number>`count(distinct ${itemNodes.itemId})` })
    .from(itemNodes)
    .where(eq(itemNodes.nodeId, nodeId));

  const [srs] = await db.select().from(srsStates).where(eq(srsStates.nodeId, nodeId)).limit(1);

  return {
    attempts: stat?.n ?? 0,
    accuracy: stat?.avg ?? 0,
    itemCount: items?.n ?? 0,
    suspended: srs?.suspended === 1,
    due: srs?.due ?? null,
  };
}

/**
 * Every topic with its coverage, for a browsable index.
 *
 * Ordered by branch then label so the list reads as a curriculum rather than a
 * database dump.
 */
export async function topicIndex(db: Database) {
  const rows = await db
    .select({ nodeId: itemNodes.nodeId, n: sql<number>`count(distinct ${itemNodes.itemId})` })
    .from(itemNodes)
    .groupBy(itemNodes.nodeId);

  const counts = new Map(rows.map((row) => [row.nodeId, row.n]));

  const accuracy = await db
    .select({ nodeId: itemNodes.nodeId, avg: sql<number>`avg(${attempts.score})`, n: sql<number>`count(*)` })
    .from(attempts)
    .innerJoin(itemNodes, eq(attempts.itemId, itemNodes.itemId))
    .groupBy(itemNodes.nodeId);

  const seen = new Map(accuracy.map((row) => [row.nodeId, { avg: row.avg ?? 0, n: row.n }]));

  return Object.values(TAXONOMY_BY_ID)
    .filter((node) => node.status === 'live')
    .map((node) => ({
      node,
      itemCount: counts.get(node.id) ?? 0,
      attempts: seen.get(node.id)?.n ?? 0,
      accuracy: seen.get(node.id)?.avg ?? 0,
    }))
    .sort((a, b) =>
      a.node.branch === b.node.branch
        ? a.node.label.localeCompare(b.node.label)
        : a.node.branch.localeCompare(b.node.branch)
    );
}
