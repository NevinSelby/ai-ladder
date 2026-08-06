import { sql } from 'drizzle-orm';

import { ACCOUNTS } from '@/content/accounts';
import { SEED_ITEMS } from '@/content/seed';
import type { Database } from '@/db/client';
import { accounts, contentItems, itemNodes, profileState } from '@/db/schema';

/**
 * First-run bootstrap.
 *
 * Seed content ships inside the bundle so the app is fully playable before it
 * has ever reached a server. Which matters both for offline use and because it
 * means the Supabase wiring can land later without blocking the daily loop.
 *
 * Idempotent: safe to run on every launch. Content upserts by id so a bundled
 * seed fix reaches an existing install without a reset, while anything pulled
 * from the server later wins on `updatedAt`.
 */
export async function bootstrapLocalData(db: Database) {
  const now = new Date().toISOString();

  await db
    .insert(profileState)
    .values({ id: 1 })
    .onConflictDoNothing()
    .run();

  for (const account of ACCOUNTS) {
    await db
      .insert(accounts)
      .values({ id: account.id, updatedAt: now })
      .onConflictDoNothing()
      .run();
  }

  for (const item of SEED_ITEMS) {
    await db
      .insert(contentItems)
      .values({
        id: item.id,
        mode: item.mode,
        nodeIds: item.nodeIds,
        difficulty: item.difficulty,
        explanation: item.explanation,
        diagramId: item.diagramId ?? null,
        citations: item.citations,
        payload: item.payload,
        origin: item.origin,
        criticScore: item.criticScore ?? null,
        verifiedAt: item.verifiedAt ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: contentItems.id,
        set: {
          mode: item.mode,
          nodeIds: item.nodeIds,
          difficulty: item.difficulty,
          explanation: item.explanation,
          diagramId: item.diagramId ?? null,
          citations: item.citations,
          payload: item.payload,
        },
        // Never clobber a server-published revision with the bundled seed.
        setWhere: sql`${contentItems.origin} = 'seed'`,
      })
      .run();
  }

  // The join table is a projection of nodeIds; rebuilding it wholesale is
  // cheaper and less error-prone than diffing.
  await db.delete(itemNodes).run();
  const rows = SEED_ITEMS.flatMap((item) =>
    item.nodeIds.map((nodeId) => ({ itemId: item.id, nodeId }))
  );
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(itemNodes).values(rows.slice(i, i + CHUNK)).run();
  }
}
