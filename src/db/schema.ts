/**
 * Local SQLite schema (Drizzle).
 *
 * This is a *cache plus outbox*, not an independent source of truth:
 *   - `contentItems` and `pricingSnapshots` are pulled down from Supabase and
 *     may be wiped and refetched at any time.
 *   - `attempts`, `srsStates`, `profileState` and `accounts` are written locally
 *     first so a drill works in airplane mode, then flushed upstream by the
 *     sync outbox.
 *
 * Anything the user produced carries `syncedAt = null` until the server has
 * acknowledged it. Nothing local is ever deleted on the strength of a failed
 * upload.
 */

import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Downloaded content. `payload` is the mode-specific JSON from shared/content.ts. */
export const contentItems = sqliteTable(
  'content_items',
  {
    id: text('id').primaryKey(),
    mode: text('mode').notNull(),
    /** JSON array of taxonomy node ids. */
    nodeIds: text('node_ids', { mode: 'json' }).$type<string[]>().notNull(),
    difficulty: text('difficulty').notNull(),
    explanation: text('explanation').notNull(),
    /** Optional diagram id rendered above the explanation. */
    diagramId: text('diagram_id'),
    citations: text('citations', { mode: 'json' }).$type<unknown[]>().notNull().default([]),
    payload: text('payload', { mode: 'json' }).$type<unknown>().notNull(),
    origin: text('origin').notNull().default('seed'),
    criticScore: real('critic_score'),
    verifiedAt: text('verified_at'),
    /** Server cursor. Delta sync pulls everything newer than the local max. */
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('content_items_mode_idx').on(table.mode)]
);

/**
 * One row per (item, node) so the scheduler can query "which items touch the
 * nodes that are due?" without a JSON scan. Rebuilt whenever content syncs.
 */
export const itemNodes = sqliteTable(
  'item_nodes',
  {
    itemId: text('item_id').notNull(),
    nodeId: text('node_id').notNull(),
  },
  (table) => [
    index('item_nodes_node_idx').on(table.nodeId),
    index('item_nodes_item_idx').on(table.itemId),
  ]
);

/** Every answer, kept forever, it is the app's own eval log. */
export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull(),
    mode: text('mode').notNull(),
    /** 0..1. Deterministic modes are 0 or 1; judgment modes are partial. */
    score: real('score').notNull(),
    /** Mode-specific: chosen ids, slot texts, transcript, whatever was produced. */
    response: text('response', { mode: 'json' }).$type<unknown>().notNull(),
    /** Grader output for judgment modes: per-slot scores and rubric hits. */
    feedback: text('feedback', { mode: 'json' }).$type<unknown>(),
    meter: text('meter').notNull(),
    xp: integer('xp').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    createdAt: text('created_at').notNull(),
    syncedAt: text('synced_at'),
  },
  (table) => [
    index('attempts_created_idx').on(table.createdAt),
    index('attempts_unsynced_idx').on(table.syncedAt),
  ]
);

/** FSRS state, one row per taxonomy node. */
export const srsStates = sqliteTable('srs_states', {
  nodeId: text('node_id').primaryKey(),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  lastReview: text('last_review'),
  due: text('due').notNull(),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  syncedAt: text('synced_at'),
});

/**
 * Single-row table holding meters, streak and settings. A key/value table would
 * be more flexible but this shape is typed, and there is exactly one player.
 */
export const profileState = sqliteTable('profile_state', {
  id: integer('id').primaryKey().default(1),
  depth: integer('depth').notNull().default(0),
  platform: integer('platform').notNull().default(0),
  aiCraft: integer('ai_craft').notNull().default(0),
  client: integer('client').notNull().default(0),
  scope: integer('scope').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  /** Best combo ever chained, purely for bragging rights on the progress screen. */
  bestCombo: integer('best_combo').notNull().default(0),
  /**
   * Spendable currency, separate from XP on purpose. XP measures skill and
   * gates levels, so it can never be given away for merely showing up; points
   * reward the habit itself (daily chest, quests) and will buy things later.
   */
  points: integer('points').notNull().default(0),
  /** 'casual' | 'regular' | 'intense', how many items a session serves. */
  dailyGoal: text('daily_goal').notNull().default('regular'),
  /** Chosen by the user; synced so a new device greets them by name. */
  displayName: text('display_name'),
  /** Device preference, deliberately not synced: haptics are per-phone. */
  hapticsEnabled: integer('haptics_enabled').notNull().default(1),
  /** Local date (YYYY-MM-DD) of the last completed session. */
  lastSessionDate: text('last_session_date'),
  /** Supabase user id once signed in; null while playing locally. */
  remoteUserId: text('remote_user_id'),
  syncedAt: text('synced_at'),
});

/** Campaign state. Seeded from a static account definition, then mutated locally. */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  phase: text('phase').notNull().default('discovery'),
  /** 0..100. Hits zero and the account churns. */
  health: integer('health').notNull().default(70),
  /** 0..100. Rises when you overpromise; makes every later session harder. */
  expectations: integer('expectations').notNull().default(40),
  status: text('status').notNull().default('active'),
  updatedAt: text('updated_at').notNull(),
  syncedAt: text('synced_at'),
});

export const accountEvents = sqliteTable(
  'account_events',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    kind: text('kind').notNull(),
    summary: text('summary').notNull(),
    healthDelta: integer('health_delta').notNull().default(0),
    expectationsDelta: integer('expectations_delta').notNull().default(0),
    /**
     * The attempt that caused this. Keeping both the attempt and the item id
     * lets the account timeline show the actual question and the answer given,
     * which is the difference between "health fell 4" and knowing why.
     */
    attemptId: text('attempt_id'),
    itemId: text('item_id'),
    /** Phase at the time, so the timeline reads in context. */
    phase: text('phase'),
    createdAt: text('created_at').notNull(),
    syncedAt: text('synced_at'),
  },
  (table) => [index('account_events_account_idx').on(table.accountId)]
);

/** Cached GCP SKU prices so Napkin Math works offline and stays current. */
export const pricingSnapshots = sqliteTable('pricing_snapshots', {
  skuId: text('sku_id').primaryKey(),
  serviceId: text('service_id').notNull(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  /** Price per unit in USD. */
  unitPrice: real('unit_price').notNull(),
  fetchedAt: text('fetched_at').notNull(),
});

/** One row per lesson read. Read-once, so the primary key is the lesson id. */
export const lessonProgress = sqliteTable('lesson_progress', {
  lessonId: text('lesson_id').primaryKey(),
  completedAt: text('completed_at').notNull(),
  /** Time actually spent on the reader, for an honest "time studied" total. */
  secondsSpent: integer('seconds_spent').notNull().default(0),
  syncedAt: text('synced_at'),
});

/**
 * One row per day you practiced.
 *
 * Derived state, the streak counter could be recomputed from `attempts`, but
 * keeping it explicit makes the calendar cheap to render and survives content
 * being wiped and re-synced, which a derived count would not.
 */
export const streakDays = sqliteTable('streak_days', {
  /** Local date, YYYY-MM-DD. */
  day: text('day').primaryKey(),
  sessions: integer('sessions').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  itemsAnswered: integer('items_answered').notNull().default(0),
  lessonsRead: integer('lessons_read').notNull().default(0),
  syncedAt: text('synced_at'),
});

/** One row per quest claimed, so a completed quest pays exactly once per day. */
export const questClaims = sqliteTable(
  'quest_claims',
  {
    day: text('day').notNull(),
    questId: text('quest_id').notNull(),
    points: integer('points').notNull().default(0),
    claimedAt: text('claimed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.questId] })]
);

/** Delta-sync cursors, one row per synced table. */
export const syncCursors = sqliteTable('sync_cursors', {
  table: text('table').primaryKey(),
  cursor: text('cursor').notNull(),
  lastRunAt: text('last_run_at').notNull().default(sql`(datetime('now'))`),
});
