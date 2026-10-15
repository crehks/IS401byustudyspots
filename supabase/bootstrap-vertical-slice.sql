-- LEGACY SMOKE TEST. Not used by the ERD-based app; do not run for this assignment.
-- Use migrations/20261008_001_report_slice.sql and seed.sql instead.
-- This old one-table script is preserved for reference, not the required schema.
-- Run in a separate development Supabase project, never over production data.
-- The demo deliberately permits public reading and insertion of non-private reports.
-- Add authentication, moderation, and abuse controls before public deployment.
begin;

create table if not exists public.study_reports_demo (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null check (char_length(spot_id) between 3 and 80 and spot_id ~ '^[a-z0-9-]+$'),
  noise text not null check (noise in ('low','medium','high')),
  busy text not null check (busy in ('low','medium','high')),
  note text not null default '' check (char_length(note) <= 240),
  created_at timestamptz not null default now()
);
create index if not exists study_reports_demo_spot_time on public.study_reports_demo (spot_id, created_at desc);
alter table public.study_reports_demo enable row level security;

revoke all on public.study_reports_demo from public, anon, authenticated;
grant select on public.study_reports_demo to anon, authenticated;
grant insert (spot_id, noise, busy, note) on public.study_reports_demo to anon, authenticated;
grant usage on schema public to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='study_reports_demo' and policyname='Read public demo reports') then
    create policy "Read public demo reports" on public.study_reports_demo for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='study_reports_demo' and policyname='Insert public demo reports') then
    create policy "Insert public demo reports" on public.study_reports_demo for insert to anon, authenticated with check (true);
  end if;
end $$;

-- Stable IDs keep repeated runs from duplicating the sample rows.
insert into public.study_reports_demo (id,spot_id,noise,busy,note) values
  ('10000000-0000-4000-8000-000000000001','hbll-west','low','low','Sample: quiet tables.'),
  ('10000000-0000-4000-8000-000000000002','wsc-tables','medium','low','Sample: some conversation, available seats.'),
  ('10000000-0000-4000-8000-000000000003','jkb-tables','low','medium','Sample: several seats occupied.')
on conflict (id) do nothing;

commit;
