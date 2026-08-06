import { supabase } from '@/lib/supabase';

/**
 * The leaderboard, read from a narrow Supabase view over everyone's profile
 * totals. Requires being signed in: the view is granted to `authenticated`
 * only, so a signed-out client gets an error rather than a scoreboard, and
 * the UI turns that into a sign-in prompt.
 */

export interface LeaderboardRow {
  id: string;
  displayName: string;
  totalXp: number;
  streakDays: number;
  longestStreak: number;
  points: number;
  rank: number;
  isMe: boolean;
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (!supabase) throw new Error('offline');
  const { data: auth } = await supabase.auth.getUser();
  const myId = auth.user?.id ?? null;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('id, display_name, total_xp, streak_days, longest_streak, points')
    .order('total_xp', { ascending: false })
    .order('streak_days', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row, i) => ({
    id: row.id,
    displayName: row.display_name ?? 'Climber',
    totalXp: row.total_xp ?? 0,
    streakDays: row.streak_days ?? 0,
    longestStreak: row.longest_streak ?? 0,
    points: row.points ?? 0,
    rank: i + 1,
    isMe: row.id === myId,
  }));
}
