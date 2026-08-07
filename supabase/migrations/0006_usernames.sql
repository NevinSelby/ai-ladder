-- Usernames.
--
-- A handle the player chooses, not something derived from their email. The
-- email local part leaks personal information onto a leaderboard other people
-- can read, and "nevin.selby2001" is nobody's chosen identity.
--
-- Uniqueness is enforced here rather than in the client, because two devices
-- can pass an availability check at the same instant and only the database can
-- settle it. Case-insensitive, so Nevin and nevin cannot both exist.

alter table profiles add column if not exists username text;

-- Case-insensitive uniqueness. A partial index so existing rows without a
-- username do not collide with each other on null.
create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username))
  where username is not null;

-- Shape rules live in the database as well as the client: 3 to 20 characters,
-- letters, digits, underscore. No leading digit, so a handle never reads as an
-- id, and no spaces or dots, which are the characters that make impersonation
-- easy (rn versus m is bad enough already).
alter table profiles drop constraint if exists profiles_username_shape;
alter table profiles add constraint profiles_username_shape
  check (username is null or username ~ '^[A-Za-z_][A-Za-z0-9_]{2,19}$');

-- ── Availability lookup ────────────────────────────────────────────────────
-- RLS on profiles is "own row only", which is correct and also means a client
-- cannot check whether a handle is taken. This function answers exactly that
-- one question and nothing else: it returns a boolean, never a row, so it
-- cannot be used to enumerate who exists or to read anybody's profile.

create or replace function username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from profiles where lower(username) = lower(candidate)
  );
$$;

revoke all on function username_available(text) from public;
grant execute on function username_available(text) to authenticated;

-- ── Public directory for the leaderboard ───────────────────────────────────
-- The board needs to show other players. It gets a view exposing only handle
-- and score, never email, so ranking someone never discloses how to contact
-- them.

create or replace view public_players
with (security_invoker = false) as
  select
    username,
    (depth + platform + ai_craft + client + scope) as total_xp,
    longest_streak
  from profiles
  where username is not null;

revoke all on public_players from public;
grant select on public_players to authenticated;
