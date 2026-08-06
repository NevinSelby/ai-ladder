import { eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { accounts, attempts, lessonProgress, profileState, srsStates } from '@/db/schema';
import { supabase } from '@/lib/supabase';

import { readProfile } from './profile';

/**
 * Outbox sync.
 *
 * Push first, then pull. Anything the player produced is written locally with
 * `syncedAt = null`; sync uploads those rows, stamps them, and then reconciles
 * server state back down. Nothing local is ever deleted because an upload
 * failed. A dropped connection must cost you a round trip, never a streak.
 *
 * Conflict rule: for append-only logs (attempts) the server is a union, so
 * order does not matter. For last-writer-wins state (meters, streak, SRS) the
 * higher value wins rather than the later timestamp, two devices that both
 * practiced offline should end up with the sum of the work, not whichever
 * happened to reconnect second.
 */

export interface SyncResult {
  pushed: { attempts: number; srs: number; accounts: number; lessons: number };
  pulled: boolean;
  error: string | null;
  at: string;
}

const CHUNK = 200;

async function chunked<T>(rows: T[], run: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await run(rows.slice(i, i + CHUNK));
  }
}

export async function syncNow(db: Database): Promise<SyncResult> {
  const at = new Date().toISOString();
  const empty = { attempts: 0, srs: 0, accounts: 0, lessons: 0 };

  if (!supabase) return { pushed: empty, pulled: false, error: 'not configured', at };
  // Bind once: the null check above does not narrow inside the async closures.
  const client = supabase;

  const { data: auth } = await client.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return { pushed: empty, pulled: false, error: 'not signed in', at };

  try {
    const pushed = { ...empty };

    // ── Push attempts (append-only) ────────────────────────────────────────
    const pendingAttempts = await db.select().from(attempts).where(isNull(attempts.syncedAt));
    if (pendingAttempts.length > 0) {
      await chunked(pendingAttempts, async (batch) => {
        const { error } = await client
          .from('attempts')
          .upsert(
            batch.map((row) => ({
              id: row.id,
              user_id: userId,
              item_id: row.itemId,
              mode: row.mode,
              score: row.score,
              response: row.response,
              feedback: row.feedback,
              meter: row.meter,
              xp: row.xp,
              elapsed_ms: row.elapsedMs,
              created_at: row.createdAt,
            })),
            { onConflict: 'id' }
          );
        if (error) throw new Error(`attempts: ${error.message}`);
      });
      await db.update(attempts).set({ syncedAt: at }).where(isNull(attempts.syncedAt)).run();
      pushed.attempts = pendingAttempts.length;
    }

    // ── Push SRS state ─────────────────────────────────────────────────────
    const pendingSrs = await db.select().from(srsStates).where(isNull(srsStates.syncedAt));
    if (pendingSrs.length > 0) {
      await chunked(pendingSrs, async (batch) => {
        const { error } = await client.from('srs_states').upsert(
          batch.map((row) => ({
            user_id: userId,
            node_id: row.nodeId,
            stability: row.stability,
            difficulty: row.difficulty,
            last_review: row.lastReview,
            due: row.due,
            reps: row.reps,
            lapses: row.lapses,
          })),
          { onConflict: 'user_id,node_id' }
        );
        if (error) throw new Error(`srs: ${error.message}`);
      });
      await db.update(srsStates).set({ syncedAt: at }).where(isNull(srsStates.syncedAt)).run();
      pushed.srs = pendingSrs.length;
    }

    // ── Push lesson progress ───────────────────────────────────────────────
    const pendingLessons = await db
      .select()
      .from(lessonProgress)
      .where(isNull(lessonProgress.syncedAt));
    if (pendingLessons.length > 0) {
      const { error } = await client.from('lesson_progress').upsert(
        pendingLessons.map((row) => ({
          user_id: userId,
          lesson_id: row.lessonId,
          completed_at: row.completedAt,
          seconds_spent: row.secondsSpent,
        })),
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) throw new Error(`lessons: ${error.message}`);
      await db
        .update(lessonProgress)
        .set({ syncedAt: at })
        .where(isNull(lessonProgress.syncedAt))
        .run();
      pushed.lessons = pendingLessons.length;
    }

    // ── Push campaign accounts ─────────────────────────────────────────────
    const pendingAccounts = await db.select().from(accounts).where(isNull(accounts.syncedAt));
    if (pendingAccounts.length > 0) {
      const { error } = await client.from('accounts').upsert(
        pendingAccounts.map((row) => ({
          user_id: userId,
          account_id: row.id,
          phase: row.phase,
          health: row.health,
          expectations: row.expectations,
          status: row.status,
        })),
        { onConflict: 'user_id,account_id' }
      );
      if (error) throw new Error(`accounts: ${error.message}`);
      await db.update(accounts).set({ syncedAt: at }).where(isNull(accounts.syncedAt)).run();
      pushed.accounts = pendingAccounts.length;
    }

    // ── Push profile (meters, streak) ──────────────────────────────────────
    const profile = await readProfile(db);
    const { error: profileError } = await client.from('profiles').upsert(
      {
        id: userId,
        display_name: profile.displayName,
        depth: profile.meters.depth,
        platform: profile.meters.platform,
        ai_craft: profile.meters.aiCraft,
        client: profile.meters.client,
        scope: profile.meters.scope,
        streak_days: profile.streakDays,
        longest_streak: profile.longestStreak,
        best_combo: profile.bestCombo,
        points: profile.points,
        daily_goal: profile.dailyGoal,
        last_session_date: profile.lastSessionDate,
      },
      { onConflict: 'id' }
    );
    if (profileError) throw new Error(`profile: ${profileError.message}`);

    // ── Pull: reconcile server state, taking the maximum ───────────────────
    const { data: remote } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (remote) {
      await db
        .update(profileState)
        .set({
          depth: Math.max(profile.meters.depth, remote.depth ?? 0),
          platform: Math.max(profile.meters.platform, remote.platform ?? 0),
          aiCraft: Math.max(profile.meters.aiCraft, remote.ai_craft ?? 0),
          client: Math.max(profile.meters.client, remote.client ?? 0),
          scope: Math.max(profile.meters.scope, remote.scope ?? 0),
          longestStreak: Math.max(profile.longestStreak, remote.longest_streak ?? 0),
          bestCombo: Math.max(profile.bestCombo, remote.best_combo ?? 0),
          points: Math.max(profile.points, remote.points ?? 0),
          remoteUserId: userId,
          syncedAt: at,
        })
        .where(eq(profileState.id, 1))
        .run();
    }

    return { pushed, pulled: Boolean(remote), error: null, at };
  } catch (error) {
    return {
      pushed: empty,
      pulled: false,
      error: error instanceof Error ? error.message : String(error),
      at,
    };
  }
}

/** How much work is waiting to upload, drives the sync badge. */
export async function pendingCount(db: Database): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(attempts)
    .where(isNull(attempts.syncedAt));
  return rows[0]?.n ?? 0;
}
