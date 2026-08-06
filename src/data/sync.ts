import { eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import {
  accounts,
  attempts,
  lessonProgress,
  profileState,
  srsStates,
  streakDays,
} from '@/db/schema';
import { supabase } from '@/lib/supabase';

import { readProfile } from './profile';

/**
 * Outbox sync.
 *
 * **Pull first, then push.** The order is not a style choice. Pushing first
 * meant a device that had just signed in upserted its own empty profile over
 * the server copy and then pulled back the zeros it had just written, so
 * signing in on a second device destroyed the first device's cloud progress
 * instead of inheriting it. Pull, merge, then push the merged result.
 *
 * Everything the player produced is written locally with `syncedAt = null`;
 * sync uploads those rows and stamps them. Nothing local is ever deleted
 * because an upload failed. A dropped connection must cost a round trip, never
 * a streak.
 *
 * Conflict rule: append-only logs (attempts) union by primary key, so order
 * does not matter. Accumulating state (meters, points, streak, day totals)
 * takes the maximum rather than the later timestamp, because two devices that
 * both practiced offline should end up with the work, not with whichever
 * happened to reconnect second. Rows pulled from the server are stamped as
 * synced so they are never echoed back up.
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

    // ══ PULL ═══════════════════════════════════════════════════════════════
    // Everything the account already knows comes down before anything local
    // goes up, so a fresh device inherits rather than overwrites.

    // ── Pull attempts ──────────────────────────────────────────────────────
    // The union of every device's history. Stamped as synced on arrival, since
    // re-uploading a row the server gave us is pure noise.
    const { data: remoteAttempts, error: attemptsPullError } = await client
      .from('attempts')
      .select('*')
      .eq('user_id', userId);
    if (attemptsPullError) throw new Error(`pull attempts: ${attemptsPullError.message}`);
    for (const row of remoteAttempts ?? []) {
      await db
        .insert(attempts)
        .values({
          id: row.id,
          itemId: row.item_id,
          mode: row.mode,
          score: Number(row.score),
          response: row.response,
          feedback: row.feedback ?? null,
          meter: row.meter,
          xp: row.xp,
          elapsedMs: row.elapsed_ms,
          createdAt: row.created_at,
          syncedAt: at,
        })
        .onConflictDoNothing()
        .run();
    }

    // ── Pull day history ───────────────────────────────────────────────────
    // Drives the practice calendar and the streak. Max-merge per day: two
    // devices practicing on the same day should not halve that day.
    const { data: remoteDays } = await client
      .from('streak_days')
      .select('*')
      .eq('user_id', userId);
    for (const row of remoteDays ?? []) {
      await db
        .insert(streakDays)
        .values({
          day: row.day,
          sessions: row.sessions,
          xp: row.xp,
          itemsAnswered: row.items_answered,
          lessonsRead: row.lessons_read,
          syncedAt: at,
        })
        .onConflictDoUpdate({
          target: streakDays.day,
          set: {
            sessions: sql`max(${streakDays.sessions}, ${row.sessions})`,
            xp: sql`max(${streakDays.xp}, ${row.xp})`,
            itemsAnswered: sql`max(${streakDays.itemsAnswered}, ${row.items_answered})`,
            lessonsRead: sql`max(${streakDays.lessonsRead}, ${row.lessons_read})`,
          },
        })
        .run();
    }

    // ── Pull SRS state ─────────────────────────────────────────────────────
    // The more-reviewed copy wins: it encodes strictly more history.
    const { data: remoteSrs } = await client
      .from('srs_states')
      .select('*')
      .eq('user_id', userId);
    for (const row of remoteSrs ?? []) {
      await db
        .insert(srsStates)
        .values({
          nodeId: row.node_id,
          stability: row.stability,
          difficulty: row.difficulty,
          lastReview: row.last_review,
          due: row.due,
          reps: row.reps,
          lapses: row.lapses,
          syncedAt: at,
        })
        .onConflictDoUpdate({
          target: srsStates.nodeId,
          set: {
            stability: sql`case when ${row.reps} > ${srsStates.reps} then ${row.stability} else ${srsStates.stability} end`,
            difficulty: sql`case when ${row.reps} > ${srsStates.reps} then ${row.difficulty} else ${srsStates.difficulty} end`,
            lastReview: sql`case when ${row.reps} > ${srsStates.reps} then ${row.last_review} else ${srsStates.lastReview} end`,
            due: sql`case when ${row.reps} > ${srsStates.reps} then ${row.due} else ${srsStates.due} end`,
            reps: sql`max(${srsStates.reps}, ${row.reps})`,
            lapses: sql`max(${srsStates.lapses}, ${row.lapses})`,
          },
        })
        .run();
    }

    // ── Pull lessons read ──────────────────────────────────────────────────
    const { data: remoteLessons } = await client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId);
    for (const row of remoteLessons ?? []) {
      await db
        .insert(lessonProgress)
        .values({
          lessonId: row.lesson_id,
          completedAt: row.completed_at,
          secondsSpent: row.seconds_spent,
          syncedAt: at,
        })
        .onConflictDoNothing()
        .run();
    }

    // ── Pull campaign accounts ─────────────────────────────────────────────
    // Health is not accumulating, so the server's newer row wins outright.
    const { data: remoteAccounts } = await client
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
    for (const row of remoteAccounts ?? []) {
      await db
        .insert(accounts)
        .values({
          id: row.account_id,
          phase: row.phase,
          health: row.health,
          expectations: row.expectations,
          status: row.status,
          updatedAt: row.updated_at,
          syncedAt: at,
        })
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            phase: sql`case when ${row.updated_at} > ${accounts.updatedAt} then ${row.phase} else ${accounts.phase} end`,
            health: sql`case when ${row.updated_at} > ${accounts.updatedAt} then ${row.health} else ${accounts.health} end`,
            expectations: sql`case when ${row.updated_at} > ${accounts.updatedAt} then ${row.expectations} else ${accounts.expectations} end`,
            status: sql`case when ${row.updated_at} > ${accounts.updatedAt} then ${row.status} else ${accounts.status} end`,
            updatedAt: sql`max(${accounts.updatedAt}, ${row.updated_at})`,
          },
        })
        .run();
    }

    // ── Pull profile, max-merged ───────────────────────────────────────────
    const { data: remote } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const before = await readProfile(db);
    if (remote) {
      await db
        .update(profileState)
        .set({
          depth: Math.max(before.meters.depth, remote.depth ?? 0),
          platform: Math.max(before.meters.platform, remote.platform ?? 0),
          aiCraft: Math.max(before.meters.aiCraft, remote.ai_craft ?? 0),
          client: Math.max(before.meters.client, remote.client ?? 0),
          scope: Math.max(before.meters.scope, remote.scope ?? 0),
          // The live streak transfers too. Only the longest was pulled before,
          // so a second device always showed a streak of zero.
          streakDays: Math.max(before.streakDays, remote.streak_days ?? 0),
          longestStreak: Math.max(before.longestStreak, remote.longest_streak ?? 0),
          bestCombo: Math.max(before.bestCombo, remote.best_combo ?? 0),
          points: Math.max(before.points, remote.points ?? 0),
          // The later practice date, so "done today" survives the hop.
          lastSessionDate:
            !before.lastSessionDate ||
            (remote.last_session_date && remote.last_session_date > before.lastSessionDate)
              ? remote.last_session_date
              : before.lastSessionDate,
          displayName: before.displayName ?? remote.display_name ?? null,
          remoteUserId: userId,
        })
        .where(eq(profileState.id, 1))
        .run();
    } else {
      await db
        .update(profileState)
        .set({ remoteUserId: userId })
        .where(eq(profileState.id, 1))
        .run();
    }

    // ══ PUSH ═══════════════════════════════════════════════════════════════

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

    // ── Push day history ───────────────────────────────────────────────────
    // Never uploaded before, so the practice calendar and the streak could not
    // survive a device change even when everything else did.
    const pendingDays = await db.select().from(streakDays).where(isNull(streakDays.syncedAt));
    if (pendingDays.length > 0) {
      await chunked(pendingDays, async (batch) => {
        const { error } = await client.from('streak_days').upsert(
          batch.map((row) => ({
            user_id: userId,
            day: row.day,
            sessions: row.sessions,
            xp: row.xp,
            items_answered: row.itemsAnswered,
            lessons_read: row.lessonsRead,
          })),
          { onConflict: 'user_id,day' }
        );
        if (error) throw new Error(`streak days: ${error.message}`);
      });
      await db.update(streakDays).set({ syncedAt: at }).where(isNull(streakDays.syncedAt)).run();
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

    // The profile now matches the server, so record when that became true.
    await db
      .update(profileState)
      .set({ syncedAt: at })
      .where(eq(profileState.id, 1))
      .run();

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
