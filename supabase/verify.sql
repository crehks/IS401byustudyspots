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
