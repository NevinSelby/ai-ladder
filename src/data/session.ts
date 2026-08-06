import { eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { attempts, contentItems, itemNodes, srsStates } from '@/db/schema';
import type { ContentItem, Mode } from '@shared/content';
import { ContentItemSchema } from '@shared/content';
import { isDue, retrievability, type SrsState } from '@shared/srs';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

export const DRILL_SESSION_SIZE = 5;

type ItemRow = typeof contentItems.$inferSelect;

function rowToItem(row: ItemRow): ContentItem | null {
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
  // A row that no longer matches the contract is a schema migration bug, not a
  // reason to crash a session. Drop it and let the validator surface it.
  return parsed.success ? parsed.data : null;
}

export interface NodeStat {
  nodeId: string;
  attempts: number;
  /** Mean score 0..1 across every attempt touching this node. */
  accuracy: number;
}

/**
 * Accuracy per taxonomy node, from the whole attempt log.
 *
 * This is what makes sessions guided rather than merely spaced: FSRS knows what
 * you are about to forget, but only the score history knows what you never got
 * right in the first place. Both signals feed selection below.
 */
export async function nodeAccuracy(db: Database): Promise<Map<string, NodeStat>> {
  const rows = await db
    .select({
      nodeId: itemNodes.nodeId,
      n: sql<number>`count(*)`,
      avg: sql<number>`avg(${attempts.score})`,
    })
    .from(attempts)
    .innerJoin(itemNodes, eq(attempts.itemId, itemNodes.itemId))
    .groupBy(itemNodes.nodeId);

  return new Map(
    rows.map((row) => [
      row.nodeId,
      { nodeId: row.nodeId, attempts: row.n, accuracy: row.avg ?? 0 },
    ])
  );
}

/**
 * Strongest and weakest topics, for the Progress screen.
 *
 * Two attempts minimum before a node may appear: one lucky or unlucky answer
 * says nothing, and a "weakest topics" list built from single data points
 * would reshuffle on every session.
 */
export async function nodeStrengths(db: Database, count = 4) {
  const stats = await nodeAccuracy(db);
  const rated = [...stats.values()]
    .filter((stat) => stat.attempts >= 2 && TAXONOMY_BY_ID[stat.nodeId])
    .map((stat) => ({ ...stat, node: TAXONOMY_BY_ID[stat.nodeId] }));

  const byAccuracy = [...rated].sort((a, b) => a.accuracy - b.accuracy);
  return {
    weakest: byAccuracy.slice(0, count),
    strongest: byAccuracy.slice(-count).reverse(),
    rated: rated.length,
  };
}

export async function readSrsStates(db: Database): Promise<Record<string, SrsState>> {
  const rows = await db.select().from(srsStates);
  const out: Record<string, SrsState> = {};
  for (const row of rows) {
    out[row.nodeId] = {
      stability: row.stability,
      difficulty: row.difficulty,
      lastReview: row.lastReview,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
    };
  }
  return out;
}

export async function writeSrsState(db: Database, nodeId: string, state: SrsState) {
  await db
    .insert(srsStates)
    .values({ nodeId, ...state, syncedAt: null })
    .onConflictDoUpdate({ target: srsStates.nodeId, set: { ...state, syncedAt: null } })
    .run();
}

/**
 * When each item was last actually served, by item id.
 *
 * SRS state is per *node*, so it cannot distinguish two questions covering the
 * same node: without this, the bank rotated only as fast as the taxonomy did.
 */
export interface ItemHistory {
  /** Epoch ms of the most recent attempt on this item. */
  lastSeen: number;
  /** Score of that most recent attempt, 0..1. */
  lastScore: number;
}

export async function historyByItem(db: Database): Promise<Map<string, ItemHistory>> {
  const rows = await db
    .select({
      itemId: attempts.itemId,
      last: sql<string>`max(${attempts.createdAt})`,
      // The score attached to that newest row, not an average: getting it right
      // once and wrong twice should not read as "mostly known".
      lastScore: sql<number>`(
        select a2.score from attempts a2
        where a2.item_id = ${attempts.itemId}
        order by a2.created_at desc limit 1
      )`,
    })
    .from(attempts)
    .groupBy(attempts.itemId);

  return new Map(
    rows
      .filter((row) => row.last)
      .map((row) => [
        row.itemId,
        { lastSeen: new Date(row.last).getTime(), lastScore: row.lastScore ?? 0 },
      ])
  );
}

/**
 * How long a question stays out of rotation after being answered correctly.
 *
 * Repeating something you just got right teaches nothing and is the single
 * loudest complaint a practice app can generate. Wrong answers come back
 * sooner, because that is the whole point of the exercise.
 */
export const CORRECT_COOLDOWN_DAYS = 10;
export const WRONG_COOLDOWN_DAYS = 1;

/** True if this item was answered recently enough that re-asking is noise. */
export function onCooldown(history: ItemHistory | undefined, now: Date): boolean {
  if (!history) return false;
  const days = (now.getTime() - history.lastSeen) / 86_400_000;
  return days < (history.lastScore >= 1 ? CORRECT_COOLDOWN_DAYS : WRONG_COOLDOWN_DAYS);
}

/**
 * Urgency of a single item, given the memory state of the nodes it covers.
 *
 * Scheduling is per-node but selection is per-item, so an item that touches
 * three shaky concepts should outrank one that touches a single solid concept.
 * Taking the worst (lowest) retrievability rather than the mean does that: an
 * item is only as safe as the weakest thing it tests.
 */
function itemUrgency(
  item: ContentItem,
  states: Record<string, SrsState>,
  stats: Map<string, NodeStat>,
  now: Date,
  history: Map<string, ItemHistory>,
  jitter: (id: string) => number
): number {
  let worst = 1;
  let unseen = 0;
  let weakness = 0;
  for (const nodeId of item.nodeIds) {
    const state = states[nodeId];
    const stat = stats.get(nodeId);
    // Weakness only counts once a node has enough history to mean something.
    if (stat && stat.attempts >= 2) {
      weakness = Math.max(weakness, 1 - stat.accuracy);
    }
    if (!state || state.reps === 0) {
      unseen += 1;
      continue;
    }
    const elapsedDays = state.lastReview
      ? (now.getTime() - new Date(state.lastReview).getTime()) / 86_400_000
      : 0;
    worst = Math.min(worst, retrievability(elapsedDays, state.stability));
  }
  /**
   * Base urgency. Lower sorts first.
   *
   * Retrievability answers "about to forget?"; accuracy answers "never
   * learned?". Never-seen content sits at a fixed 0.45, below genuinely
   * overdue material but above anything comfortably retained, so a session
   * mixes review with new ground.
   */
  const base =
    unseen === item.nodeIds.length ? 0.45 : worst * 0.65 + (1 - weakness) * 0.35;

  /**
   * Item-level cooldown.
   *
   * Without this the bank barely rotated: SRS tracks nodes, so every question
   * on a node scored identically and the earliest one in file order won every
   * time. An item served an hour ago is pushed right down; the penalty decays
   * to nothing over a week, by which point re-asking is the point.
   */
  const seen = history.get(item.id);
  const daysSince = seen ? (now.getTime() - seen.lastSeen) / 86_400_000 : Infinity;
  // A correct answer buys a long rest; a wrong one buys a short one.
  const window = seen && seen.lastScore >= 1 ? CORRECT_COOLDOWN_DAYS * 2 : WRONG_COOLDOWN_DAYS * 3;
  const cooldown = Number.isFinite(daysSince) ? Math.max(0, 0.9 * (1 - daysSince / window)) : 0;

  /**
   * Tie-break jitter.
   *
   * Scores collide constantly, every unseen item is exactly 0.45, and a stable
   * sort then serves the same five questions in the same order forever. This
   * was the actual repeat bug. The jitter is small enough that a genuinely
   * overdue item still outranks a fresh one, and large enough that equals get
   * shuffled rather than alphabetized.
   */
  return base + cooldown + jitter(item.id) * 0.08;
}

/**
 * A stable random weight per item for one selection pass.
 *
 * Built once per session so the ordering is self-consistent while it is being
 * computed, and different next time the screen asks.
 */
function makeJitter(): (id: string) => number {
  const cache = new Map<string, number>();
  return (id: string) => {
    let value = cache.get(id);
    if (value === undefined) {
      value = Math.random();
      cache.set(id, value);
    }
    return value;
  };
}

export interface SessionPlan {
  items: ContentItem[];
  /** Node ids the session will exercise, for the pre-session summary. */
  nodeIds: string[];
  /** How many of the chosen items are review rather than new ground. */
  reviewCount: number;
}

/**
 * Build a drill session.
 *
 * Rules, in priority order:
 *   1. never repeat a node twice in one session. Five questions on VPC-SC is a
 *      worse session than five questions on five things,
 *   2. lead with the lowest retrievability (closest to forgotten),
 *   3. fill the remainder with unseen content.
 */
export async function buildDrillSession(
  db: Database,
  size = DRILL_SESSION_SIZE,
  now = new Date()
): Promise<SessionPlan> {
  const rows = await db.select().from(contentItems).where(eq(contentItems.mode, 'drill'));
  const states = await readSrsStates(db);
  const stats = await nodeAccuracy(db);
  const history = await historyByItem(db);
  const jitter = makeJitter();

  const live = rows
    .map(rowToItem)
    .filter((item): item is ContentItem => item !== null)
    .filter((item) => item.nodeIds.every((id) => TAXONOMY_BY_ID[id]?.status === 'live'));

  /**
   * Hard exclusion, not just a ranking penalty.
   *
   * Scoring alone let a recently-correct item resurface whenever the fresh pool
   * ran thin for its node. If enough uncooled questions exist to fill the
   * session, cooled ones are simply not candidates. The fallback keeps a small
   * bank playable rather than serving a short session.
   */
  const fresh = live.filter((item) => !onCooldown(history.get(item.id), now));
  const pool = fresh.length >= size ? fresh : live;

  const candidates = pool
    .map((item) => ({ item, urgency: itemUrgency(item, states, stats, now, history, jitter) }))
    .sort((a, b) => a.urgency - b.urgency);

  const chosen: ContentItem[] = [];
  const usedNodes = new Set<string>();
  let reviewCount = 0;

  for (const { item, urgency } of candidates) {
    if (chosen.length >= size) break;
    if (item.nodeIds.some((id) => usedNodes.has(id))) continue;
    chosen.push(item);
    item.nodeIds.forEach((id) => usedNodes.add(id));
    if (item.nodeIds.some((id) => states[id] && states[id].reps > 0)) reviewCount += 1;
  }

  // Small bank, or a session late in the day where every node is already used:
  // relax the no-repeat rule rather than serve a short session.
  if (chosen.length < size) {
    for (const { item } of candidates) {
      if (chosen.length >= size) break;
      if (chosen.includes(item)) continue;
      chosen.push(item);
      item.nodeIds.forEach((id) => usedNodes.add(id));
    }
  }

  return { items: chosen, nodeIds: [...usedNodes], reviewCount };
}

/** Items available for a non-drill mode, most urgent first. */
export async function itemsForMode(
  db: Database,
  mode: Mode,
  now = new Date()
): Promise<ContentItem[]> {
  const rows = await db.select().from(contentItems).where(eq(contentItems.mode, mode));
  const states = await readSrsStates(db);
  const stats = await nodeAccuracy(db);
  const history = await historyByItem(db);
  const jitter = makeJitter();

  const all = rows.map(rowToItem).filter((item): item is ContentItem => item !== null);
  // Same rule as the drill: prefer questions that are not on cooldown, and only
  // fall back to the full bank when there are too few to run a round.
  const fresh = all.filter((item) => !onCooldown(history.get(item.id), now));
  const pool = fresh.length >= 5 ? fresh : all;

  return pool.sort(
    (a, b) =>
      itemUrgency(a, states, stats, now, history, jitter) -
      itemUrgency(b, states, stats, now, history, jitter)
  );
}

export async function itemById(db: Database, id: string): Promise<ContentItem | null> {
  const rows = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return rows[0] ? rowToItem(rows[0]) : null;
}

/** How many nodes are due right now, drives the "review waiting" hint. */
export async function dueNodeCount(db: Database, now = new Date()): Promise<number> {
  const states = await readSrsStates(db);
  return Object.entries(states).filter(([, state]) => isDue(state, now)).length;
}

export async function nodesTouchedBy(db: Database, itemIds: string[]): Promise<string[]> {
  if (itemIds.length === 0) return [];
  const rows = await db.select().from(contentItems).where(inArray(contentItems.id, itemIds));
  return [...new Set(rows.flatMap((row) => row.nodeIds))];
}
