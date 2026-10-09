-- RUN ONCE for the confirmed LIVE schema, in the project used by .env.
-- Study Spot and ReportSpotStatus must be empty; existing parent rows are preserved.
-- Do not run the older SETUP_REPORT_SLICE.sql for this schema.
-- No tables are recreated, dropped, or cleared. Row/schema changes use a transaction.
-- Sequence values can advance on a failed transaction; skipped IDs are harmless.
-- Public fictional classroom demo; no login or real personal information.
begin;
lock table public."Buildings",public."Floors",public."SpotType",public."Study Spot",public."User",public."ReportSpotStatus" in access exclusive mode;
do $$
begin
  if exists(select 1 from public."Study Spot") or exists(select 1 from public."ReportSpotStatus") then
    raise exception 'Study Spot and ReportSpotStatus must be empty for this one-time seed. Existing rows were NOT deleted.';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ReportSpotStatus' and column_name='report_id' and is_identity='YES') then
    raise exception 'report_id must already be an identity column. No changes applied.';
  end if;
end $$;
insert into public."Buildings" (building_id,building_location,opening_hrs,closing_hrs,building_name) overriding system value values
(1,'Sample: HBLL','07:00','23:00','HBLL'),(2,'Sample: WSC','07:00','22:00','WSC'),(3,'Sample: JKB','08:00','21:00','JKB') on conflict(building_id) do nothing;
insert into public."Floors" (floor_id,floor_number,building_id) overriding system value values
(1,2,1),(2,3,1),(3,4,1),(4,1,2),(5,2,2),(6,3,2),(7,4,2),(8,5,2),(9,6,2),(10,0,3),(11,2,3) on conflict(floor_id) do nothing;
insert into public."SpotType" (spot_type_id,type_name) overriding system value values
(1,'Solo'),(2,'Group'),(3,'Solo private') on conflict(spot_type_id) do nothing;
insert into public."User" (user_id,first_name,last_name) overriding system value values
(1,'Demo','Student'),(2,'Sample','Student'),(3,'Example','Student') on conflict(user_id) do nothing;
-- Existing user 1 is the team-confirmed fictional demo identity; names stay unchanged.
-- Verify fixed parent IDs before associating sample spots. Never overwrite conflicts.
do $$
begin
 if exists(select 1 from (values(1,'HBLL'),(2,'WSC'),(3,'JKB')) expected(id,name)
   join public."Buildings" b on b.building_id=expected.id where b.building_name is distinct from expected.name) then
   raise exception 'Building IDs 1/2/3 conflict with HBLL/WSC/JKB. No rows overwritten; request an adapted mapping.';
 end if;
 if exists(select 1 from (values(1,2,1),(2,3,1),(3,4,1),(4,1,2),(5,2,2),(6,3,2),(7,4,2),(8,5,2),(9,6,2),(10,0,3),(11,2,3)) expected(id,num,building)
   join public."Floors" f on f.floor_id=expected.id where f.floor_number is distinct from expected.num::bigint or f.building_id is distinct from expected.building::bigint) then
   raise exception 'Floor IDs conflict with the sample mapping. No rows overwritten; request an adapted mapping.';
 end if;
 if exists(select 1 from (values(1,'Solo'),(2,'Group'),(3,'Solo private')) expected(id,name)
   join public."SpotType" t on t.spot_type_id=expected.id where t.type_name is distinct from expected.name) then
   raise exception 'Spot type IDs conflict with the sample mapping. No rows overwritten; request an adapted mapping.';
 end if;
end $$;
insert into public."Study Spot" (spot_id,spot_type_id,building_id,floor_id,outlets,capacity,spot_location,reservable) overriding system value values
(1,1,1,2,true,1,'Sample: entry level open area',false),
(2,1,1,2,true,1,'Sample: west study corner',false),
(3,2,1,2,true,6,'Sample: entry level room',true),
(4,2,1,1,true,6,'Sample: level 2 group area',false),
(5,1,1,1,false,1,'Sample: level 2 reading area',false),
(6,3,1,1,true,1,'Sample: level 2 room',true),
(7,1,1,3,true,1,'Sample: level 4 open area',false),
(8,2,2,4,true,4,'Sample: floor 1 East view',false),
(9,1,2,4,false,1,'Sample: floor 1 East view',false),
(10,2,2,4,false,6,'Sample: floor 1 West view',false),
(11,1,2,4,true,1,'Sample: floor 1 West view',false),
(12,2,2,5,true,6,'Sample: floor 2 East view',false),
(13,1,2,5,false,1,'Sample: floor 2 East view',false),
(14,2,2,5,true,6,'Sample: floor 2 West view',false),
(15,1,2,5,false,1,'Sample: floor 2 West view',false),
(16,2,2,6,true,4,'Sample: floor 3 East view',false),
(17,1,2,6,false,1,'Sample: floor 3 East view',false),
(18,2,2,6,true,8,'Sample: floor 3 West view',false),
(19,1,2,6,false,1,'Sample: floor 3 West view',false),
(20,1,2,7,false,1,'Sample: floor 4 view',false),
(21,1,2,8,true,1,'Sample: floor 5 view',false),
(22,2,2,9,false,4,'Sample: floor 6 view',false),
(23,1,3,10,true,1,'Sample: ground floor open area',false),
(24,3,3,10,false,1,'Sample: ground floor nook',false),
(25,2,3,11,true,8,'Sample: level 2 group area',false);
-- Add ERD relationships even if the UI did not configure foreign keys.
alter table public."Floors" add constraint studybyu_floor_building_fk foreign key(building_id) references public."Buildings"(building_id);
alter table public."Study Spot" add constraint studybyu_spot_type_fk foreign key(spot_type_id) references public."SpotType"(spot_type_id);
alter table public."Study Spot" add constraint studybyu_spot_building_fk foreign key(building_id) references public."Buildings"(building_id);
alter table public."Floors" add constraint studybyu_floor_building_unique unique(floor_id,building_id);
alter table public."Study Spot" add constraint studybyu_spot_floor_building_fk foreign key(floor_id,building_id) references public."Floors"(floor_id,building_id);
alter table public."ReportSpotStatus" add constraint studybyu_report_spot_fk foreign key(spot_id) references public."Study Spot"(spot_id);
alter table public."ReportSpotStatus" add constraint studybyu_report_user_fk foreign key(user_id) references public."User"(user_id);
alter table public."ReportSpotStatus" alter column user_id set default 1;
alter table public."ReportSpotStatus" alter column created_at set default now();
alter table public."ReportSpotStatus" alter column spot_id set not null;
alter table public."ReportSpotStatus" alter column user_id set not null;
alter table public."ReportSpotStatus" alter column created_at set not null;
alter table public."ReportSpotStatus" alter column noise_level set not null;
alter table public."ReportSpotStatus" alter column crowd_level set not null;
alter table public."ReportSpotStatus" add constraint studybyu_noise_range check(noise_level between 1 and 3);
alter table public."ReportSpotStatus" add constraint studybyu_crowd_range check(crowd_level between 1 and 3);
alter table public."ReportSpotStatus" add constraint studybyu_note_length check(char_length(notes)<=240);
insert into public."ReportSpotStatus"(spot_id,user_id,noise_level,crowd_level,notes,created_at) values
(2,1,1,1,'Sample: quiet tables.','2026-01-01T12:00:00Z'),
(8,2,2,1,'Sample: available seats.','2026-01-01T12:00:00Z'),
(23,3,1,2,'Sample: several seats occupied.','2026-01-01T12:00:00Z');
-- Advance existing identity/serial sequences after explicit sample IDs.
do $$
declare item record; seq text; highest bigint;
begin
  for item in select * from (values ('Buildings','building_id'),('Floors','floor_id'),('SpotType','spot_type_id'),('Study Spot','spot_id'),('User','user_id')) as t(tbl,col) loop
    seq:=pg_get_serial_sequence(format('public.%I',item.tbl),item.col);
    if seq is not null then
      execute format('select max(%I) from public.%I',item.col,item.tbl) into highest;
      perform setval(seq::regclass,highest,true);
    end if;
  end loop;
end $$;
alter table public."Buildings" enable row level security;
alter table public."Floors" enable row level security;
alter table public."SpotType" enable row level security;
alter table public."Study Spot" enable row level security;
alter table public."User" enable row level security;
alter table public."ReportSpotStatus" enable row level security;
-- Stop rather than silently retaining unknown permissive policies.
do $$
begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('Buildings','Floors','SpotType','Study Spot','User','ReportSpotStatus')) then
   raise exception 'Existing RLS policies found. Request a policy review; this setup will not replace them.';
 end if;
end $$;
revoke all on public."Buildings",public."Floors",public."SpotType",public."Study Spot",public."User",public."ReportSpotStatus" from public,anon,authenticated;
grant usage on schema public to anon,authenticated;
grant select on public."Study Spot",public."ReportSpotStatus" to anon,authenticated;
grant insert(spot_id,noise_level,crowd_level,notes) on public."ReportSpotStatus" to anon,authenticated;
do $$
declare seq text;
begin
 seq:=pg_get_serial_sequence('public."ReportSpotStatus"','report_id');
 if seq is not null then execute format('grant usage on sequence %s to anon,authenticated',seq); end if;
end $$;
create policy studybyu_read_spots on public."Study Spot" for select to anon,authenticated using(true);
create policy studybyu_read_reports on public."ReportSpotStatus" for select to anon,authenticated using(true);
create policy studybyu_submit_report on public."ReportSpotStatus" for insert to anon,authenticated with check
(user_id=1 and exists(select 1 from public."Study Spot" s where s.spot_id="ReportSpotStatus".spot_id and s.reservable=false));
create or replace view public.latest_report_spot_status with(security_invoker=true) as
select distinct on(spot_id) report_id,created_at,spot_id,user_id,noise_level,crowd_level,notes
from public."ReportSpotStatus" order by spot_id,created_at desc,report_id desc;
revoke all on public.latest_report_spot_status from public,anon,authenticated;
grant select on public.latest_report_spot_status to anon,authenticated;
notify pgrst,'reload schema';
commit;
select 'Buildings' as table_name,count(*) as rows from public."Buildings"
union all select 'Floors',count(*) from public."Floors"
union all select 'SpotType',count(*) from public."SpotType"
union all select 'Study Spot',count(*) from public."Study Spot"
union all select 'User',count(*) from public."User"
union all select 'ReportSpotStatus',count(*) from public."ReportSpotStatus";


