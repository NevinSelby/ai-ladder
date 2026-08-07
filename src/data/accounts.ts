import { desc, eq, inArray } from 'drizzle-orm';

import { ACCOUNTS, ACCOUNTS_BY_ID, ACCOUNT_PHASES, type AccountPhase } from '@/content/accounts';
import type { Database } from '@/db/client';
import { accountEvents, accounts, attempts, contentItems } from '@/db/schema';
import type { ContentItem } from '@shared/content';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * The campaign layer.
 *
 * Every answer you give is attributed to whichever account that topic belongs
 * to, and moves that account's health. The point is that practice has a
 * consequence you can point at: not "you scored 60%", but "St. Brigid's health
 * fell because you put PHI outside the perimeter, and here is the question".
 *
 * Attribution is by taxonomy branch. Each account declares the branches its
 * engagement leans on, so a VPC-SC question lands on the bank and a
 * bad-news question lands on the health network. An item that matches nothing
 * simply does not touch the board, which is correct, not everything you learn
 * is about a customer.
 */

export interface AccountImpact {
  accountId: string;
  healthDelta: number;
  expectationsDelta: number;
  summary: string;
}

/**
 * Nodes where getting it wrong means you promised something you cannot keep.
 * These raise the expectations bar rather than lowering health, a distinct
 * failure with a distinct, longer-lasting cost.
 */
const OVERPROMISE_NODES = new Set([
  'cust.expectations',
  'cust.explaining_ai',
  'cust.bad_news',
  'del.poc_exit',
  'ai.nondeterminism',
]);

/** Which account, if any, this item belongs to. */
export function attributeItem(item: ContentItem, healthByAccount: Map<string, number>): string | null {
  const branches = new Set(
    item.nodeIds.map((id) => TAXONOMY_BY_ID[id]?.branch).filter(Boolean) as string[]
  );
  if (branches.size === 0) return null;

  const candidates = ACCOUNTS.filter((account) =>
    account.emphasis.some((branch) => branches.has(branch))
  );
  if (candidates.length === 0) return null;

  // Several accounts often share a branch. Route to whichever is struggling
  // most, so practice naturally flows to the engagement that needs it, and so
  // the board does not pile everything onto one card.
  return candidates.reduce((worst, account) =>
    (healthByAccount.get(account.id) ?? 70) < (healthByAccount.get(worst.id) ?? 70) ? account : worst
  ).id;
}

function impactFor(item: ContentItem, score: number): { health: number; expectations: number } {
  const overpromise = item.nodeIds.some((id) => OVERPROMISE_NODES.has(id));
  const weight = item.difficulty === 'edge' ? 3 : item.difficulty === 'deep' ? 2 : 1;

  if (score >= 1) return { health: weight, expectations: overpromise ? -weight : 0 };
  /**
   * Partial credit moves the board partially.
   *
   * This used to return zero, which meant a half-correct multi-select produced
   * no health change *and no timeline row*, so the account history silently
   * omitted answers the player had actually given. Scaling around the halfway
   * mark keeps the sign honest: better than half helps, worse than half hurts.
   */
  if (score > 0) {
    const signed = (score - 0.5) * 2;
    const health = Math.round(weight * signed);
    return {
      health,
      expectations: overpromise ? Math.round(-weight * signed) : 0,
    };
  }
  // A miss on an expectation-setting topic raises what you have promised rather
  // than lowering health: the damage shows up later, which is the lesson.
  return overpromise
    ? { health: -weight, expectations: weight * 2 }
    : { health: -weight * 2, expectations: 0 };
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Apply a finished session to the board.
 *
 * Called once per session with everything answered, so a session produces one
 * coherent set of movements rather than a flurry of one-point nudges.
 */
export async function applyAttemptsToBoard(
  db: Database,
  results: { item: ContentItem; score: number; attemptId: string }[]
): Promise<AccountImpact[]> {
  if (results.length === 0) return [];

  const rows = await db.select().from(accounts);
  const health = new Map(rows.map((row) => [row.id, row.health]));
  const phase = new Map(rows.map((row) => [row.id, row.phase]));
  const totals = new Map<string, AccountImpact>();
  const now = new Date().toISOString();

  for (const result of results) {
    const accountId = attributeItem(result.item, health);
    if (!accountId) continue;

    const delta = impactFor(result.item, result.score);
    // No early exit on a zero delta. An exactly-half answer moves nothing, but
    // it still happened, and a timeline that omits answers is a timeline the
    // player cannot trust.

    const account = ACCOUNTS_BY_ID[accountId];
    const verdict = result.score >= 1 ? 'Handled well' : result.score > 0 ? 'Partly right' : 'Got this wrong';

    await db
      .insert(accountEvents)
      .values({
        id: `evt_${result.attemptId}`,
        accountId,
        kind: result.score >= 1 ? 'win' : 'slip',
        summary: `${verdict}, ${result.item.nodeIds
          .map((id) => TAXONOMY_BY_ID[id]?.label)
          .filter(Boolean)
          .slice(0, 2)
          .join(', ')}`,
        healthDelta: delta.health,
        expectationsDelta: delta.expectations,
        attemptId: result.attemptId,
        itemId: result.item.id,
        phase: phase.get(accountId) ?? 'discovery',
        createdAt: now,
        syncedAt: null,
      })
      .onConflictDoNothing()
      .run();

    const running = totals.get(accountId) ?? {
      accountId,
      healthDelta: 0,
      expectationsDelta: 0,
      summary: account.name,
    };
    running.healthDelta += delta.health;
    running.expectationsDelta += delta.expectations;
    totals.set(accountId, running);
  }

  // Persist the new bar positions, and advance the phase when an account has
  // been consistently healthy, progress you can see on the card.
  for (const [accountId, impact] of totals) {
    const row = rows.find((r) => r.id === accountId);
    if (!row) continue;
    const nextHealth = clamp(row.health + impact.healthDelta);
    const nextExpectations = clamp(row.expectations + impact.expectationsDelta);

    const phaseIndex = ACCOUNT_PHASES.indexOf(row.phase as AccountPhase);
    const advance = nextHealth >= 85 && nextExpectations <= 45 && phaseIndex < ACCOUNT_PHASES.length - 1;

    await db
      .update(accounts)
      .set({
        health: nextHealth,
        expectations: nextExpectations,
        phase: advance ? ACCOUNT_PHASES[phaseIndex + 1] : row.phase,
        status: nextHealth <= 0 ? 'churned' : row.status,
        updatedAt: now,
        syncedAt: null,
      })
      .where(eq(accounts.id, accountId))
      .run();

    if (advance) {
      await db
        .insert(accountEvents)
        .values({
          id: `evt_phase_${accountId}_${Date.now()}`,
          accountId,
          kind: 'phase',
          summary: `Moved to ${ACCOUNT_PHASES[phaseIndex + 1]}`,
          healthDelta: 0,
          expectationsDelta: 0,
          phase: ACCOUNT_PHASES[phaseIndex + 1],
          createdAt: now,
          syncedAt: null,
        })
        .onConflictDoNothing()
        .run();
    }
  }

  return [...totals.values()];
}

// ── Reading the timeline ───────────────────────────────────────────────────

export interface TimelineEntry {
  id: string;
  kind: string;
  summary: string;
  healthDelta: number;
  expectationsDelta: number;
  phase: string | null;
  createdAt: string;
  /** The question that caused it, when there was one. */
  question: string | null;
  yourAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
}

/** Pull one choice's text out of a drill payload by id. */
function choiceText(payload: unknown, id: string | null): string | null {
  if (!id || !payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: { id: string; text: string }[] }).choices;
  return choices?.find((choice) => choice.id === id)?.text ?? null;
}

export async function accountTimeline(
  db: Database,
  accountId: string,
  limit = 40
): Promise<TimelineEntry[]> {
  const events = await db
    .select()
    .from(accountEvents)
    .where(eq(accountEvents.accountId, accountId))
    .orderBy(desc(accountEvents.createdAt))
    .limit(limit);

  if (events.length === 0) return [];

  const itemIds = [...new Set(events.map((e) => e.itemId).filter(Boolean))] as string[];
  const attemptIds = [...new Set(events.map((e) => e.attemptId).filter(Boolean))] as string[];

  const items = itemIds.length
    ? await db.select().from(contentItems).where(inArray(contentItems.id, itemIds))
    : [];
  const tries = attemptIds.length
    ? await db.select().from(attempts).where(inArray(attempts.id, attemptIds))
    : [];

  const itemById = new Map(items.map((i) => [i.id, i]));
  const attemptById = new Map(tries.map((a) => [a.id, a]));

  return events.map((event) => {
    const item = event.itemId ? itemById.get(event.itemId) : undefined;
    const attempt = event.attemptId ? attemptById.get(event.attemptId) : undefined;
    const payload = item?.payload as { stem?: string; correctId?: string } | undefined;
    const response = attempt?.response as { kind?: string; choiceId?: string } | undefined;

    return {
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      healthDelta: event.healthDelta,
      expectationsDelta: event.expectationsDelta,
      phase: event.phase,
      createdAt: event.createdAt,
      question: payload?.stem ?? null,
      yourAnswer: choiceText(item?.payload, response?.choiceId ?? null),
      correctAnswer: choiceText(item?.payload, payload?.correctId ?? null),
      explanation: item?.explanation ?? null,
    };
  });
}

export async function accountRow(db: Database, accountId: string) {
  const rows = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return rows[0] ?? null;
}
