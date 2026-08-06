import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { attemptSummary } from '@/data/attempts';
import { EMPTY_PROFILE, localDateKey, readProfile, streakAtRisk } from '@/data/profile';
import { dueNodeCount } from '@/data/session';
import { db } from '@/db';

/**
 * Read models for the shell screens.
 *
 * These deliberately go through TanStack Query rather than Drizzle's live query
 * hook: several of them are derived aggregates rather than plain table reads,
 * and a single explicit `refreshAppState()` after a session is easier to reason
 * about than five independent subscriptions firing mid-animation.
 */

export const APP_STATE_KEY = ['app-state'] as const;

const EMPTY_STATUS = {
  doneToday: false,
  atRisk: false,
  dueNodes: 0,
  summary: { total: 0, last7Days: 0, averageScore: 0 },
};

export function useProfile() {
  // placeholderData, not initialData: initialData counts as *fresh* under the
  // client's staleTime, so the query never fetches and the screen shows the
  // placeholder forever. That is what left the Board empty.
  const query = useQuery({
    queryKey: [...APP_STATE_KEY, 'profile'],
    queryFn: () => readProfile(db),
    placeholderData: EMPTY_PROFILE,
  });
  return { ...query, data: query.data ?? EMPTY_PROFILE };
}

export function useSessionStatus() {
  const query = useQuery({
    queryKey: [...APP_STATE_KEY, 'session-status'],
    queryFn: async () => {
      const profile = await readProfile(db);
      const today = localDateKey();
      return {
        doneToday: profile.lastSessionDate === today,
        atRisk: streakAtRisk(profile, today),
        dueNodes: await dueNodeCount(db),
        summary: await attemptSummary(db),
      };
    },
    placeholderData: EMPTY_STATUS,
  });
  return { ...query, data: query.data ?? EMPTY_STATUS };
}

export function useRefreshAppState() {
  const client = useQueryClient();
  return useCallback(() => {
    client.invalidateQueries({ queryKey: APP_STATE_KEY });
  }, [client]);
}
