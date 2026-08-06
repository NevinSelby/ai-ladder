-- AI Ladder core schema.
--
-- Shape mirrors the local SQLite cache in src/db/schema.ts, with three
-- additions that only make sense server-side: the content pipeline tables
-- (source_documents, review_queue), the LLM call log, and per-user spend caps.
--
-- Access model: content is world-readable to signed-in users and writable only
-- by the service role (the generator runs as service role from an edge
-- function). Everything a player produces is row-owned and readable only by
-- them. There is deliberately no "share my progress" path yet — adding one
-- later is a new policy, whereas walking back an over-permissive default is a
-- migration and an apology.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ── Enums ──────────────────────────────────────────────────────────────────

create type content_mode as enum (
  'drill', 'arena', 'napkin', 'decompose', 'room',
  'incident', 'blueprint', 'evallab', 'discovery'
);

create type content_status as enum ('draft', 'review', 'published', 'needs_review', 'retired');

create type difficulty_level as enum ('intro', 'core', 'deep', 'edge');

create type meter_key as enum ('depth', 'platform', 'aiCraft', 'client', 'scope');

create type account_phase as enum (
  'discovery', 'scoping', 'pilot', 'hardening', 'production', 'handover'
);

create type account_status as enum ('active', 'churned', 'recovered', 'complete');

-- ── Player ─────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  depth integer not null default 0,
  platform integer not null default 0,
  ai_craft integer not null default 0,
  client integer not null default 0,
  scope integer not null default 0,
  streak_days integer not null default 0,
  longest_streak integer not null default 0,
  -- Local calendar date of the last completed session, as reported by the
  -- device. Stored as text because the streak follows the player's day, not UTC.
  last_session_date text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Taxonomy ───────────────────────────────────────────────────────────────
-- Mirrors shared/taxonomy.ts. Duplicated into the database so the generator can
-- join against it and so a node rename is a data migration rather than a
-- client release.

create table taxonomy_nodes (
  id text primary key,
  branch text not null,
  label text not null,
  blurb text not null,
  meter meter_key not null,
  cloud text not null default 'neutral',
  status text not null default 'live',
  requires text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── Content pipeline ───────────────────────────────────────────────────────

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  -- Stable hash of the fetched body; the ingest step dedupes on this.
  content_hash text not null unique,
  source_key text not null,          -- 'gcp_release_notes', 'gemini_docs', ...
  title text not null,
  url text not null,
  body text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  -- Set when a newer document supersedes this one. Drives the staleness sweep.
  superseded_by uuid references source_documents(id),
  embedding vector(768)
);

create index source_documents_source_idx on source_documents (source_key, published_at desc);
create index source_documents_superseded_idx on source_documents (superseded_by)
  where superseded_by is not null;

create table content_items (
  id text primary key,
  mode content_mode not null,
  node_ids text[] not null,
  difficulty difficulty_level not null,
  explanation text not null,
  citations jsonb not null default '[]',
  payload jsonb not null,
  status content_status not null default 'draft',
  origin text not null default 'seed',
  critic_score numeric(5,2),
  -- Grounding. An item with no source_ids can only reach 'published' if it is
  -- hand-authored seed content; the generator's publish gate requires at least
  -- one, which is what stops a confident hallucination becoming a quiz question.
  source_ids uuid[] not null default '{}',
  verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_items_mode_status_idx on content_items (mode, status);
create index content_items_updated_idx on content_items (updated_at);
create index content_items_nodes_idx on content_items using gin (node_ids);
create index content_items_sources_idx on content_items using gin (source_ids);

-- Items the critic scored below the bar, or that the staleness sweep pulled.
create table review_queue (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references content_items(id) on delete cascade,
  reason text not null,
  critic_notes jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create index review_queue_open_idx on review_queue (created_at) where resolved_at is null;

-- Versioned grading rubrics for the judgment modes. Data, not code, so a rubric
-- can be tuned and historical attempts re-graded against a named version.
create table rubrics (
  id text primary key,              -- e.g. 'decompose.v1'
  mode content_mode not null,
  version integer not null,
  definition jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index rubrics_active_per_mode on rubrics (mode) where active;

-- ── Play log ───────────────────────────────────────────────────────────────

create table attempts (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null,
  mode content_mode not null,
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  response jsonb not null,
  feedback jsonb,
  rubric_id text references rubrics(id),
  meter meter_key not null,
  xp integer not null,
  elapsed_ms integer not null,
  created_at timestamptz not null default now()
);

create index attempts_user_created_idx on attempts (user_id, created_at desc);
create index attempts_item_idx on attempts (item_id);

create table srs_states (
  user_id uuid not null references auth.users on delete cascade,
  node_id text not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  last_review timestamptz,
  due timestamptz not null,
  reps integer not null default 0,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

create index srs_states_due_idx on srs_states (user_id, due);

-- ── Campaign ───────────────────────────────────────────────────────────────

create table accounts (
  user_id uuid not null references auth.users on delete cascade,
  account_id text not null,
  phase account_phase not null default 'discovery',
  health integer not null default 70 check (health between 0 and 100),
  expectations integer not null default 40 check (expectations between 0 and 100),
  status account_status not null default 'active',
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id)
);

create table account_events (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  account_id text not null,
  kind text not null,
  summary text not null,
  health_delta integer not null default 0,
  expectations_delta integer not null default 0,
  attempt_id text,
  created_at timestamptz not null default now()
);

create index account_events_user_account_idx on account_events (user_id, account_id, created_at desc);

-- ── Live pricing ───────────────────────────────────────────────────────────
-- Refreshed from the Cloud Billing Catalog / Pricing API so Napkin Math answers
-- are computed against prices that are actually current.

create table pricing_snapshots (
  sku_id text primary key,
  service_id text not null,
  description text not null,
  unit text not null,
  unit_price numeric(18,10) not null,
  currency text not null default 'USD',
  region text,
  fetched_at timestamptz not null default now()
);

create index pricing_snapshots_service_idx on pricing_snapshots (service_id);

-- ── Cost control & observability ───────────────────────────────────────────
-- Every model call the platform makes, whether generating content, critiquing
-- it, or grading a player's answer. This is the app's own eval and cost log,
-- and the reason a runaway prompt shows up as a line item rather than a bill.

create table llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  purpose text not null,             -- 'triage' | 'generate' | 'critic' | 'grade' | 'room_turn'
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  latency_ms integer,
  ok boolean not null default true,
  error text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index llm_calls_created_idx on llm_calls (created_at desc);
create index llm_calls_user_idx on llm_calls (user_id, created_at desc);
create index llm_calls_purpose_idx on llm_calls (purpose, created_at desc);

create table usage_limits (
  user_id uuid primary key references auth.users on delete cascade,
  day date not null default current_date,
  graded_calls integer not null default 0,
  output_tokens integer not null default 0,
  -- Per-day ceiling. Hitting it disables the model-graded modes until tomorrow
  -- rather than silently degrading them, so the failure is legible.
  daily_call_cap integer not null default 60,
  updated_at timestamptz not null default now()
);

-- ── Row level security ─────────────────────────────────────────────────────

alter table profiles           enable row level security;
alter table attempts           enable row level security;
alter table srs_states         enable row level security;
alter table accounts           enable row level security;
alter table account_events     enable row level security;
alter table usage_limits       enable row level security;
alter table content_items      enable row level security;
alter table taxonomy_nodes     enable row level security;
alter table pricing_snapshots  enable row level security;
alter table rubrics            enable row level security;
alter table source_documents   enable row level security;
alter table review_queue       enable row level security;
alter table llm_calls          enable row level security;

-- Player-owned rows: full access to your own, none to anyone else's.
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own attempts" on attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own srs" on srs_states
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own account events" on account_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own usage" on usage_limits
  for select using (auth.uid() = user_id);

-- Published content is readable by any signed-in player. Writes are service
-- role only, which bypasses RLS — so there is deliberately no insert policy.
create policy "read published content" on content_items
  for select to authenticated using (status = 'published');

create policy "read taxonomy" on taxonomy_nodes
  for select to authenticated using (true);

create policy "read pricing" on pricing_snapshots
  for select to authenticated using (true);

create policy "read active rubrics" on rubrics
  for select to authenticated using (active);

-- source_documents, review_queue and llm_calls have RLS on and no policies:
-- unreachable from a client key, service role only. That is intentional — the
-- pipeline's internals are not player-facing surface area.

-- ── Triggers ───────────────────────────────────────────────────────────────

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch      before update on profiles      for each row execute function touch_updated_at();
create trigger content_items_touch before update on content_items for each row execute function touch_updated_at();
create trigger srs_states_touch    before update on srs_states    for each row execute function touch_updated_at();
create trigger accounts_touch      before update on accounts      for each row execute function touch_updated_at();

-- New sign-ups get a profile and a starting board without a round trip.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.accounts (user_id, account_id)
    select new.id, unnest(array['stbrigid', 'kestrel', 'arbor', 'northwind'])
    on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
