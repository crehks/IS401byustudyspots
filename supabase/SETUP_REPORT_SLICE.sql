-- FINALDBWORKstudyBYU: RUN ONCE in the SAME development project as .env.
-- This combines the existing migration, sample data, and verification.
-- Do not run if these six tables already exist; inspect existing schema first.
-- No tables or existing reports are dropped or overwritten.
-- Public fictional classroom demo only; never enter personal information.

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


-- Run after the report-slice migration. All names, locations, hours, and reports
-- are fictional/illustrative classroom samples, NOT verified campus operations.
-- Stable keys and DO NOTHING make repeats safe without resetting new reports.
begin;

insert into public.buildings (building_id, location, building_opens, building_closes) values
  ('HBLL', 'Sample: Harold B. Lee Library, BYU campus', '07:00', '23:00'),
  ('WSC', 'Sample: Wilkinson Student Center, BYU campus', '07:00', '22:00'),
  ('JKB', 'Sample: Jesse Knight Building, BYU campus', '08:00', '21:00')
on conflict do nothing;

-- East/West are drawing views of the SAME physical WSC floor.
insert into public.floors (floor_id, building_id, floor_number) values
  ('HBLL-L2', 'HBLL', 2), ('HBLL-L3', 'HBLL', 3), ('HBLL-L4', 'HBLL', 4),
  ('WSC-1', 'WSC', 1), ('WSC-2', 'WSC', 2), ('WSC-3', 'WSC', 3),
  ('WSC-4', 'WSC', 4), ('WSC-5', 'WSC', 5), ('WSC-6', 'WSC', 6),
  ('JKB-G', 'JKB', 0), ('JKB-L2', 'JKB', 2)
on conflict do nothing;

insert into public.spot_types (type_id, description) values
  ('solo', 'Individual study in an open area'),
  ('group', 'Group study for two to eight people'),
  ('solo-private', 'Individual study in a separated space')
on conflict do nothing;

-- IDs match every built-in frontend study spot, including all WSC floor views.
insert into public.study_spots (spot_id, spot_type_id, building_id, floor_id, spot_name, outlets, capacity, location, reservable, seat_type) values
  ('hbll-commons','solo','HBLL','HBLL-L3','Entry level open tables',true,1,'Sample: entry level open area',false,'table'),
  ('hbll-west','solo','HBLL','HBLL-L3','West study corner',true,1,'Sample: west study corner',false,'table'),
  ('hbll-group','group','HBLL','HBLL-L3','Group study room',true,6,'Sample: entry level room',true,'table'),
  ('hbll-think','group','HBLL','HBLL-L2','Think Tank area',true,6,'Sample: level 2 group area',false,'table'),
  ('hbll-reading','solo','HBLL','HBLL-L2','Reading Room area',false,1,'Sample: level 2 reading area',false,'chair'),
  ('hbll-single','solo-private','HBLL','HBLL-L2','Single-user study room',true,1,'Sample: level 2 room',true,'desk'),
  ('hbll-upper','solo','HBLL','HBLL-L4','Upper level tables',true,1,'Sample: level 4 open area',false,'table'),
  ('wsc-tables','group','WSC','WSC-1','East hall tables (sample)',true,4,'Sample: floor 1 East view',false,'table'),
  ('wsc-lounge','solo','WSC','WSC-1','East open seating (sample)',false,1,'Sample: floor 1 East view',false,'chair'),
  ('wsc-1w-atrium','group','WSC','WSC-1','West atrium seating (sample)',false,6,'Sample: floor 1 West view',false,'chair'),
  ('wsc-1w-nook','solo','WSC','WSC-1','West side nook (sample)',true,1,'Sample: floor 1 West view',false,'chair'),
  ('wsc-upper','group','WSC','WSC-2','Second-floor tables (sample)',true,6,'Sample: floor 2 East view',false,'table'),
  ('wsc-2e-seating','solo','WSC','WSC-2','East seating area (sample)',false,1,'Sample: floor 2 East view',false,'chair'),
  ('wsc-2w-open','group','WSC','WSC-2','West open area (sample)',true,6,'Sample: floor 2 West view',false,'table'),
  ('wsc-2w-corner','solo','WSC','WSC-2','Southwest corner (sample)',false,1,'Sample: floor 2 West view',false,'chair'),
  ('wsc-3e-hall','group','WSC','WSC-3','Third-floor hall (sample)',true,4,'Sample: floor 3 East view',false,'table'),
  ('wsc-3e-corner','solo','WSC','WSC-3','East quiet corner (sample)',false,1,'Sample: floor 3 East view',false,'chair'),
  ('wsc-3w-open','group','WSC','WSC-3','West open area (sample)',true,8,'Sample: floor 3 West view',false,'table'),
  ('wsc-3w-south','solo','WSC','WSC-3','West corridor nook (sample)',false,1,'Sample: floor 3 West view',false,'chair'),
  ('wsc-4f','solo','WSC','WSC-4','Fourth-floor alcove (sample)',false,1,'Sample: floor 4 view',false,'chair'),
  ('wsc-5f','solo','WSC','WSC-5','Fifth-floor seating (sample)',true,1,'Sample: floor 5 view',false,'chair'),
  ('wsc-6f','group','WSC','WSC-6','Sixth-floor open area (sample)',false,4,'Sample: floor 6 view',false,'table'),
  ('jkb-tables','solo','JKB','JKB-G','Ground level tables',true,1,'Sample: ground floor open area',false,'table'),
  ('jkb-nook','solo-private','JKB','JKB-G','Quiet study nook',false,1,'Sample: ground floor nook',false,'chair'),
  ('jkb-group','group','JKB','JKB-L2','Group table area',true,8,'Sample: level 2 group area',false,'table')
on conflict do nothing;

insert into public.users (user_id, first_name, last_name) values
  ('00000000-0000-4000-8000-000000000001','Demo','Student'),
  ('00000000-0000-4000-8000-000000000002','Sample','Student'),
  ('00000000-0000-4000-8000-000000000003','Example','Student')
on conflict do nothing;

insert into public.user_reports (report_id, spot_id, user_id, noise_level, crowd_levels, notes, time_reported) values
  ('10000000-0000-4000-8000-000000000001','hbll-west','00000000-0000-4000-8000-000000000001','low','low','Sample report: quiet tables.','2026-01-01T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000002','wsc-tables','00000000-0000-4000-8000-000000000002','medium','low','Sample report: available seats.','2026-01-01T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000003','jkb-tables','00000000-0000-4000-8000-000000000003','low','medium','Sample report: several seats occupied.','2026-01-01T12:00:00Z')
on conflict do nothing;

commit;


-- Read-only checks. Run after migration + seed in Supabase SQL Editor.
-- Every count must be >= 3. Study spots = 25 and floors = 11 on a fresh setup.
select 'buildings' as table_name, count(*) as sample_rows from public.buildings
union all select 'floors', count(*) from public.floors
union all select 'spot_types', count(*) from public.spot_types
union all select 'study_spots', count(*) from public.study_spots
union all select 'users', count(*) from public.users
union all select 'user_reports', count(*) from public.user_reports
order by table_name;

select r.report_id, s.spot_name, b.building_id, f.floor_number,
       u.first_name, u.last_name, r.noise_level, r.crowd_levels,
       r.notes, r.time_reported
from public.latest_spot_reports r
join public.study_spots s on s.spot_id = r.spot_id
join public.buildings b on b.building_id = s.building_id
join public.floors f on f.floor_id = s.floor_id and f.building_id = s.building_id
join public.users u on u.user_id = r.user_id
order by r.time_reported desc;

select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename in ('buildings','floors','spot_types','study_spots','users','user_reports')
order by tablename;

