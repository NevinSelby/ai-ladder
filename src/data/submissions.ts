import { desc, eq, isNull } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { submissions } from '@/db/schema';
import { supabase } from '@/lib/supabase';

import {
  validateSubmission,
  type SubmissionDraft,
  type SubmissionProblem,
} from '@shared/submissions';

import { localDateKey } from './profile';

export { validateSubmission, isSafeHttpUrl } from '@shared/submissions';
export type { SubmissionDraft, SubmissionProblem } from '@shared/submissions';

/**
 * Community submissions.
 *
 * A question written by a user is never shown to anyone else until a human
 * approves it. That is not politeness, it is the only defensible design: an
 * unmoderated shared bank is a channel for wrong answers, spam and abuse, and
 * a study app that teaches something false is worse than one with less
 * content.
 *
 * Everything here is validated twice. Once on the way in, so obvious junk
 * never leaves the device, and again server-side by row-level security and a
 * moderation queue that only a reviewer can promote.
 */

let counter = 0;
function submissionId(): string {
  counter += 1;
  return `sub_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Save a validated draft locally and queue it for upload. */
export async function saveSubmission(db: Database, draft: SubmissionDraft): Promise<string> {
  const problems = validateSubmission(draft);
  if (problems.length > 0) throw new Error(problems[0].message);

  const id = submissionId();
  const filled = draft.choices.filter((choice) => choice.text.trim().length > 0);

  await db
    .insert(submissions)
    .values({
      id,
      mode: 'drill',
      nodeIds: draft.nodeIds,
      difficulty: draft.difficulty,
      stem: draft.stem.trim(),
      payload: {
        kind: 'mcq',
        stem: draft.stem.trim(),
        choices: filled.map((choice) => ({
          id: choice.id,
          text: choice.text.trim(),
          whyWrong: choice.id === draft.correctId ? undefined : (choice.whyWrong ?? '').trim(),
        })),
        correctId: draft.correctId,
      },
      explanation: draft.explanation.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      status: 'submitted',
      createdAt: new Date().toISOString(),
      syncedAt: null,
    })
    .run();

  return id;
}

export async function mySubmissions(db: Database) {
  return db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(50);
}

/** How many submissions this device made today, for rate limiting. */
export async function submissionsToday(db: Database, today = localDateKey()): Promise<number> {
  const rows = await db.select().from(submissions);
  return rows.filter((row) => localDateKey(new Date(row.createdAt)) === today).length;
}

export const DAILY_SUBMISSION_LIMIT = 10;

/**
 * Push queued submissions to the moderation queue.
 *
 * Requires a signed-in account. Anonymous submission would mean no way to rate
 * limit, no way to revoke a bad actor, and no way to credit an author.
 */
export async function pushSubmissions(db: Database): Promise<{ pushed: number; error: string | null }> {
  if (!supabase) return { pushed: 0, error: 'not configured' };
  const client = supabase;

  const { data: auth } = await client.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return { pushed: 0, error: 'not signed in' };

  const pending = await db.select().from(submissions).where(isNull(submissions.syncedAt));
  if (pending.length === 0) return { pushed: 0, error: null };

  const { error } = await client.from('submissions').insert(
    pending.map((row) => ({
      id: row.id,
      user_id: userId,
      mode: row.mode,
      node_ids: row.nodeIds,
      difficulty: row.difficulty,
      payload: row.payload,
      explanation: row.explanation,
      source_url: row.sourceUrl,
      // Status is set by the server default and cannot be chosen by the client:
      // a client that could set 'approved' would be the whole vulnerability.
    }))
  );
  if (error) return { pushed: 0, error: error.message };

  const at = new Date().toISOString();
  for (const row of pending) {
    await db.update(submissions).set({ syncedAt: at }).where(eq(submissions.id, row.id)).run();
  }
  return { pushed: pending.length, error: null };
}
