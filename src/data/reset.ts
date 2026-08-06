import type { Database } from '@/db/client';
import {
  accountEvents,
  accounts,
  attempts,
  lessonProgress,
  profileState,
  srsStates,
  streakDays,
} from '@/db/schema';
import { ACCOUNTS } from '@/content/accounts';
import { eq } from 'drizzle-orm';

/**
 * Wipe the player, keep the library.
 *
 * Deletes everything the user produced and resets the profile row in place.
 * Content tables are untouched: questions and lessons are the app, not the
 * player. This exists because a settings page without a way out is a trap for
 * anyone who lent their phone to a friend or wants a clean run, and hiding
 * reset behind a reinstall punishes exactly the people most invested.
 *
 * It only clears the local device. Anything already backed up to the server
 * stays there, which is stated plainly in the confirmation dialog rather than
 * discovered later.
 */
export async function resetAllProgress(db: Database) {
  await db.delete(attempts).run();
  await db.delete(srsStates).run();
  await db.delete(streakDays).run();
  await db.delete(lessonProgress).run();
  await db.delete(accountEvents).run();

  const now = new Date().toISOString();
  for (const account of ACCOUNTS) {
    await db
      .update(accounts)
      .set({ phase: 'discovery', health: 70, expectations: 40, status: 'active', updatedAt: now, syncedAt: null })
      .where(eq(accounts.id, account.id))
      .run();
  }

  await db
    .update(profileState)
    .set({
      depth: 0,
      platform: 0,
      aiCraft: 0,
      client: 0,
      scope: 0,
      streakDays: 0,
      longestStreak: 0,
      bestCombo: 0,
      lastSessionDate: null,
      syncedAt: null,
      // The name and preferences survive: the person is the same person.
    })
    .where(eq(profileState.id, 1))
    .run();
}
