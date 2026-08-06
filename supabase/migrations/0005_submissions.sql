-- Community submissions and their moderation queue.
--
-- The client can insert and read its own rows and nothing else. It cannot set
-- `status`, cannot read anyone else's drafts, and cannot promote a row into the
-- published bank: approval happens through a reviewer with the service role.
-- An unmoderated community bank in a study app is a channel for teaching people
-- things that are wrong, which is worse than having less content.

create table if not exists submissions (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  mode content_mode not null default 'drill',
  node_ids text[] not null,
  difficulty text not null,
  payload jsonb not null,
  explanation text not null,
  source_url text not null,
  -- Set by the server, never by the client. See the insert policy below.
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists submissions_user_idx on submissions (user_id, created_at desc);
create index if not exists submissions_status_idx on submissions (status, created_at desc);

-- Bound the payload so a single row cannot be used as free storage.
alter table submissions
  add constraint submissions_payload_size check (pg_column_size(payload) < 20000);
alter table submissions
  add constraint submissions_source_https check (source_url like 'https://%');

alter table submissions enable row level security;

drop policy if exists "insert own submissions" on submissions;
create policy "insert own submissions" on submissions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    -- A client that could insert an approved row would defeat moderation
    -- entirely, so the only status it may write is the default.
    and status = 'submitted'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists "read own submissions" on submissions;
create policy "read own submissions" on submissions
  for select to authenticated
  using (auth.uid() = user_id);

-- Deliberately no update or delete policy: an author cannot edit a row after
-- submitting it, so what a reviewer reads is what was sent.

-- Rate limit in the database rather than only in the app, because the app is
-- not the only thing that can call the API.
create or replace function enforce_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from submissions
  where user_id = new.user_id
    and created_at > now() - interval '1 day';

  if recent >= 10 then
    raise exception 'submission rate limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_rate_limit on submissions;
create trigger submissions_rate_limit
  before insert on submissions
  for each row execute function enforce_submission_rate_limit();
