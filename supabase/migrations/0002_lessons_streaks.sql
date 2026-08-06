-- Lessons, streak history, and the profile columns the client tracks.
--
-- Split from 0001 so the core schema stays readable; both apply cleanly to an
-- empty project in order.

-- ── Profile additions ──────────────────────────────────────────────────────

alter table profiles add column if not exists best_combo integer not null default 0;
alter table profiles add column if not exists daily_goal text not null default 'regular';

-- ── Lesson progress ────────────────────────────────────────────────────────
-- Lessons are read-once, so a row exists only after completion. Time spent is
-- recorded so "hours studied" is measured rather than estimated from a count.

create table if not exists lesson_progress (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  seconds_spent integer not null default 0,
  primary key (user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on lesson_progress (user_id, completed_at desc);

-- ── Streak history ─────────────────────────────────────────────────────────
-- One row per local day the user practised. Derived from attempts in principle,
-- kept explicit so the calendar is a single cheap read and survives a content
-- wipe that a recomputed count would not.

create table if not exists streak_days (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  sessions integer not null default 1,
  xp integer not null default 0,
  items_answered integer not null default 0,
  lessons_read integer not null default 0,
  primary key (user_id, day)
);

create index if not exists streak_days_user_idx on streak_days (user_id, day desc);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table lesson_progress enable row level security;
alter table streak_days     enable row level security;

drop policy if exists "own lesson progress" on lesson_progress;
create policy "own lesson progress" on lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own streak days" on streak_days;
create policy "own streak days" on streak_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Attempts are the play log and the app's own eval record. Allow insert and
-- read, but never update or delete: a synced attempt is history, and history
-- that can be rewritten is not evidence.
drop policy if exists "own attempts" on attempts;
create policy "insert own attempts" on attempts
  for insert with check (auth.uid() = user_id);
create policy "read own attempts" on attempts
  for select using (auth.uid() = user_id);
