-- Restores the duplicate "HBLL" building (id 1) exactly as it was before 2026-11-12, if you ever want it back.
-- What was done: spots 3 and 4 (rooms 4732 and 4364, with their Reservable links) and resources 1 and 2 were moved to
-- HBLL #1001 (floor id 1003, floor 4); floors 1, 2, 3 of building 1 and building 1 itself were then removed.
-- Run in the Supabase SQL editor. The floor-lock override is needed to recreate floors with their old ids.
begin;
select set_config('nook.allow_floor_change', 'on', true);

insert into public."Buildings" (building_id, created_at, building_name)
  overriding system value values (1, '2026-10-08 23:42:06.395253+00', 'HBLL');

insert into public."Floors" (floor_id, created_at, building_id, floor_number) overriding system value values
  (1, '2026-10-08 23:42:58.792113+00', 1, 4),
  (2, '2026-08-28 01:45:50+00', 1, 2),
  (3, '2026-01-09 01:43:17+00', 1, 3);

update public."StudySpot" set building_id = 1, floor_id = 1 where spot_id in (3, 4);
update public."Resources" set building_id = 1, floor_id = 1 where resource_id in (1, 2);

commit;
