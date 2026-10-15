-- RUN ONCE for the confirmed LIVE schema, in the project used by .env.
-- Preserves existing spots and parents; samples use IDs 1001+.
-- ReportSpotStatus must still be empty for this one-time setup.
-- Do not run the older SETUP_REPORT_SLICE.sql for this schema.
-- No tables are recreated, dropped, or cleared. Row/schema changes use a transaction.
-- Sequence values can advance on a failed transaction; skipped IDs are harmless.
-- Public fictional classroom demo; no login or real personal information.
begin;
lock table public."Buildings",public."Floors",public."SpotType",public."Study Spot",public."User",public."ReportSpotStatus" in access exclusive mode;
do $$
begin
  if exists(select 1 from public."ReportSpotStatus") then
    raise exception 'Reports now exist. No rows deleted; request a permissions-only adaptation.';
  end if;
  if exists(select 1 from public."Study Spot" where spot_id between 1001 and 1025)
     or exists(select 1 from public."Buildings" where building_id between 1001 and 1003)
     or exists(select 1 from public."Floors" where floor_id between 1001 and 1011)
     or exists(select 1 from public."SpotType" where spot_type_id between 1001 and 1003)
     or exists(select 1 from public."User" where user_id between 1001 and 1003) then
    raise exception 'Sample IDs 1001+ are already in use. No rows overwritten; do not rerun or reset.';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ReportSpotStatus' and column_name='report_id' and is_identity='YES') then
    raise exception 'report_id must already be an identity column. No changes applied.';
  end if;
end $$;
insert into public."Buildings" (building_id,building_location,opening_hrs,closing_hrs,building_name) overriding system value values
(1001,'Sample: HBLL','07:00','23:00','HBLL'),(1002,'Sample: WSC','07:00','22:00','WSC'),(1003,'Sample: JKB','08:00','21:00','JKB') on conflict(building_id) do nothing;
insert into public."Floors" (floor_id,floor_number,building_id) overriding system value values
(1001,2,1001),(1002,3,1001),(1003,4,1001),(1004,1,1002),(1005,2,1002),(1006,3,1002),(1007,4,1002),(1008,5,1002),(1009,6,1002),(1010,0,1003),(1011,2,1003) on conflict(floor_id) do nothing;
insert into public."SpotType" (spot_type_id,type_name) overriding system value values
(1001,'Solo'),(1002,'Group'),(1003,'Solo private') on conflict(spot_type_id) do nothing;
insert into public."User" (user_id,first_name,last_name) overriding system value values
(1001,'Demo','Student'),(1002,'Sample','Student'),(1003,'Example','Student') on conflict(user_id) do nothing;
-- Samples use a separate fictional demo user 1001. Existing user 1 is untouched.
insert into public."Study Spot" (spot_id,spot_type_id,building_id,floor_id,outlets,capacity,spot_location,reservable) overriding system value values
(1001,1001,1001,1002,true,1,'Sample: entry level open area',false),
(1002,1001,1001,1002,true,1,'Sample: west study corner',false),
(1003,1002,1001,1002,true,6,'Sample: entry level room',true),
(1004,1002,1001,1001,true,6,'Sample: level 2 group area',false),
(1005,1001,1001,1001,false,1,'Sample: level 2 reading area',false),
(1006,1003,1001,1001,true,1,'Sample: level 2 room',true),
(1007,1001,1001,1003,true,1,'Sample: level 4 open area',false),
(1008,1002,1002,1004,true,4,'Sample: floor 1 East view',false),
(1009,1001,1002,1004,false,1,'Sample: floor 1 East view',false),
(1010,1002,1002,1004,false,6,'Sample: floor 1 West view',false),
(1011,1001,1002,1004,true,1,'Sample: floor 1 West view',false),
(1012,1002,1002,1005,true,6,'Sample: floor 2 East view',false),
(1013,1001,1002,1005,false,1,'Sample: floor 2 East view',false),
(1014,1002,1002,1005,true,6,'Sample: floor 2 West view',false),
(1015,1001,1002,1005,false,1,'Sample: floor 2 West view',false),
(1016,1002,1002,1006,true,4,'Sample: floor 3 East view',false),
(1017,1001,1002,1006,false,1,'Sample: floor 3 East view',false),
(1018,1002,1002,1006,true,8,'Sample: floor 3 West view',false),
(1019,1001,1002,1006,false,1,'Sample: floor 3 West view',false),
(1020,1001,1002,1007,false,1,'Sample: floor 4 view',false),
(1021,1001,1002,1008,true,1,'Sample: floor 5 view',false),
(1022,1002,1002,1009,false,4,'Sample: floor 6 view',false),
(1023,1001,1003,1010,true,1,'Sample: ground floor open area',false),
(1024,1003,1003,1010,false,1,'Sample: ground floor nook',false),
(1025,1002,1003,1011,true,8,'Sample: level 2 group area',false);
-- Add ERD relationships even if the UI did not configure foreign keys.
alter table public."Floors" add constraint studybyu_floor_building_fk foreign key(building_id) references public."Buildings"(building_id);
alter table public."Study Spot" add constraint studybyu_spot_type_fk foreign key(spot_type_id) references public."SpotType"(spot_type_id);
alter table public."Study Spot" add constraint studybyu_spot_building_fk foreign key(building_id) references public."Buildings"(building_id);
alter table public."Floors" add constraint studybyu_floor_building_unique unique(floor_id,building_id);
alter table public."Study Spot" add constraint studybyu_spot_floor_building_fk foreign key(floor_id,building_id) references public."Floors"(floor_id,building_id);
alter table public."ReportSpotStatus" add constraint studybyu_report_spot_fk foreign key(spot_id) references public."Study Spot"(spot_id);
alter table public."ReportSpotStatus" add constraint studybyu_report_user_fk foreign key(user_id) references public."User"(user_id);
alter table public."ReportSpotStatus" alter column user_id set default 1001;
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
(1002,1001,1,1,'Sample: quiet tables.','2026-01-01T12:00:00Z'),
(1008,1002,2,1,'Sample: available seats.','2026-01-01T12:00:00Z'),
(1023,1003,1,2,'Sample: several seats occupied.','2026-01-01T12:00:00Z');
-- Advance existing identity/serial sequences after explicit sample IDs.
do $$
declare item record; seq text; highest bigint; current_sequence bigint;
begin
  for item in select * from (values ('Buildings','building_id'),('Floors','floor_id'),('SpotType','spot_type_id'),('Study Spot','spot_id'),('User','user_id')) as t(tbl,col) loop
    seq:=pg_get_serial_sequence(format('public.%I',item.tbl),item.col);
    if seq is not null then
      execute format('select max(%I) from public.%I',item.col,item.tbl) into highest;
      execute format('select last_value from %s',seq) into current_sequence;
      perform setval(seq::regclass,greatest(highest,current_sequence),true);
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
create policy studybyu_read_reports on public."ReportSpotStatus" for select to anon,authenticated using(spot_id between 1001 and 1025);
create policy studybyu_submit_report on public."ReportSpotStatus" for insert to anon,authenticated with check
(user_id=1001 and spot_id between 1001 and 1025 and exists(select 1 from public."Study Spot" s where s.spot_id="ReportSpotStatus".spot_id and s.reservable=false));
create or replace view public.latest_report_spot_status with(security_invoker=true) as
select distinct on(spot_id) report_id,created_at,spot_id,user_id,noise_level,crowd_level,notes
from public."ReportSpotStatus" where spot_id between 1001 and 1025 order by spot_id,created_at desc,report_id desc;
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




