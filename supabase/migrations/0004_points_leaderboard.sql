-- ── Points and the leaderboard ─────────────────────────────────────────────
-- Points are the spendable currency (daily chest, quests), deliberately
-- separate from the XP meters so levels stay skill-earned. Max-merge on sync,
-- same rule as the meters.

alter table profiles add column if not exists points integer not null default 0;

-- The leaderboard is a security-definer view owned by postgres, which is the
-- point: profiles RLS restricts each user to their own row, and this view is
-- the one deliberate, narrow hole in that wall. It exposes only what a
-- scoreboard needs (name, totals, streak), never email, goal, or timezone.
create or replace view leaderboard as
select
  id,
  coalesce(nullif(trim(display_name), ''), 'Climber') as display_name,
  depth + platform + ai_craft + client + scope       as total_xp,
  streak_days,
  longest_streak,
  points,
  last_session_date
from profiles;

-- Signed-in users only: the board is for people on it.
revoke all on leaderboard from anon, public;
grant select on leaderboard to authenticated;
