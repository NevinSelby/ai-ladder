-- Account events gain a link back to the attempt that caused them, so the
-- board timeline can show the actual question and the answer given rather than
-- only a number moving.

alter table account_events add column if not exists attempt_id text;
alter table account_events add column if not exists item_id text;
alter table account_events add column if not exists phase text;
