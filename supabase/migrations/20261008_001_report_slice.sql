-- Study BYU: six entities from the supplied ERD, one Confirm report slice.
-- Run ONCE in a fresh DEVELOPMENT Supabase project, then run ../seed.sql.
-- Public demo reports only. No real identities, authentication, or production use.
-- No DROP, destructive reset, or changes to the old study_reports_demo table.
begin;

create table public.buildings (
  building_id text primary key,
  location text not null,
  building_opens time not null,
  building_closes time not null
);

create table public.floors (
  floor_id text not null,
  building_id text not null references public.buildings(building_id),
  floor_number integer not null,
  primary key (floor_id, building_id),
  unique (building_id, floor_number)
);

create table public.spot_types (
  type_id text primary key,
  description text not null
);

create table public.study_spots (
  spot_id text primary key check (char_length(spot_id) between 3 and 80 and spot_id ~ '^[a-z0-9-]+$'),
  spot_type_id text not null references public.spot_types(type_id),
  building_id text not null references public.buildings(building_id),
  floor_id text not null,
  spot_name text not null,
  outlets boolean not null default false,
  capacity integer not null check (capacity between 1 and 8),
  location text not null,
  reservable boolean not null default false,
  seat_type text not null,
  foreign key (floor_id, building_id) references public.floors(floor_id, building_id)
);

create table public.users (
  user_id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null
);

create table public.user_reports (
  report_id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.study_spots(spot_id),
  -- A seeded fictional classroom identity, NOT Supabase Auth or a login.
  user_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.users(user_id),
  noise_level text not null check (noise_level in ('low', 'medium', 'high')),
  crowd_levels text not null check (crowd_levels in ('low', 'medium', 'high')),
  notes text not null default '' check (char_length(notes) <= 240),
  time_reported timestamptz not null default clock_timestamp()
);

create index study_spots_type_idx on public.study_spots(spot_type_id);
create index study_spots_floor_idx on public.study_spots(floor_id, building_id);
create index user_reports_spot_time_idx on public.user_reports(spot_id, time_reported desc, report_id desc);
create index user_reports_user_idx on public.user_reports(user_id);

alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.spot_types enable row level security;
alter table public.study_spots enable row level security;
alter table public.users enable row level security;
alter table public.user_reports enable row level security;

revoke all on public.buildings, public.floors, public.spot_types, public.study_spots, public.users, public.user_reports from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.buildings, public.floors, public.spot_types, public.study_spots, public.user_reports to anon, authenticated;
-- Only this action can write. Clients cannot choose ID, user, or timestamp.
grant insert (spot_id, noise_level, crowd_levels, notes) on public.user_reports to anon, authenticated;

create policy "Read demo buildings" on public.buildings for select to anon, authenticated using (true);
create policy "Read demo floors" on public.floors for select to anon, authenticated using (true);
create policy "Read demo spot types" on public.spot_types for select to anon, authenticated using (true);
create policy "Read demo spots" on public.study_spots for select to anon, authenticated using (true);
create policy "Read public classroom reports" on public.user_reports for select to anon, authenticated using (true);
create policy "Submit fictional classroom report" on public.user_reports for insert to anon, authenticated
  with check (
    user_id = '00000000-0000-4000-8000-000000000001'::uuid
    and exists (select 1 from public.study_spots s where s.spot_id = user_reports.spot_id and not s.reservable)
  );
-- Users has no public policy or grant: the UI does not need names.

-- One latest row PER spot, not the latest N reports across the whole campus.
-- security_invoker preserves the requesting role's underlying RLS policies.
create view public.latest_spot_reports with (security_invoker = true) as
select distinct on (spot_id)
  report_id, spot_id, user_id, noise_level, crowd_levels, notes, time_reported
from public.user_reports
order by spot_id, time_reported desc, report_id desc;
revoke all on public.latest_spot_reports from public, anon, authenticated;
grant select on public.latest_spot_reports to anon, authenticated;

commit;
