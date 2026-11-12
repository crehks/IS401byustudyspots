-- ROUND 2 LIVE CHANGES. Run once in the Supabase SQL editor (one transaction: all of it applies, or none of it).
-- 1) Remove the duplicate HBLL (id 1): its 2 rooms, their reservation links and 2 resources move to HBLL #1001 first.
--    Restore script if you ever need it back: supabase/rollback/restore-duplicate-hbll-1.sql
-- 2) Quiet / Social are the only noise levels (legacy "high" becomes Social; the live site keeps working until the new code is merged).
-- 3) The Test User grading account can no longer be deleted (the database refuses, even from the dashboard).
begin;

-- ===================== 1. duplicate HBLL (building 1) =====================
do $mv$
declare moved_spots int; moved_res int; gone_floors int; gone_building int;
begin
  if not exists (select 1 from public."Buildings" where building_id = 1) then
    raise notice 'Building 1 is already gone; nothing to move.';
    return;
  end if;
  -- Re-point the two rooms (with their Reservable links) and two resources to HBLL #1001, floor 4 (floor id 1003).
  update public."StudySpot" set building_id = 1001, floor_id = 1003 where spot_id in (3, 4) and building_id = 1 and floor_id = 1;
  get diagnostics moved_spots = row_count;
  update public."Resources" set building_id = 1001, floor_id = 1003 where resource_id in (1, 2) and building_id = 1 and floor_id = 1;
  get diagnostics moved_res = row_count;
  if moved_spots <> 2 or moved_res <> 2 then
    raise exception 'Expected to move 2 spots and 2 resources, found % and %. Nothing was changed.', moved_spots, moved_res;
  end if;
  -- Remove the now-empty floors of building 1 (floor lock lifted for this transaction only), then the building.
  perform set_config('nook.allow_floor_change', 'on', true);
  delete from public."Floors" where building_id = 1 and floor_id in (1, 2, 3);
  get diagnostics gone_floors = row_count;
  perform set_config('nook.allow_floor_change', '', true);
  if gone_floors <> 3 or exists (select 1 from public."Floors" where building_id = 1) then
    raise exception 'Expected to remove exactly floors 1, 2 and 3 of building 1 (removed %). Nothing was changed.', gone_floors;
  end if;
  delete from public."Buildings" where building_id = 1;
  get diagnostics gone_building = row_count;
  if gone_building <> 1 then
    raise exception 'Expected to remove building 1 (removed %). Nothing was changed.', gone_building;
  end if;
end $mv$;

-- ===================== 2. 20261111_008_noise_quiet_social.sql =====================
-- DEV PAGE. The site has two noise levels, Quiet (stored low / 1) and Social (stored medium / 2).
-- This removes the third level so erroneous values cannot be stored, without breaking the site that is live today.
--
-- Transition note: the deployed site's old report form may still send "high" / 3 until the new site code is merged.
-- The coercion triggers below turn that into Social instead of rejecting it. Drop them once the new code is live:
--   drop trigger noise_quiet_social_trg on public."ReportSpotStatus"; (same for "SpotSubmission", public.spot_reports)

-- 1) Existing rows: anything above Social becomes Social.
update public."ReportSpotStatus" set noise_level = 2 where noise_level > 2;
update public."SpotSubmission"   set noise_level = 2 where noise_level > 2;
update public.spot_reports set noise_level = 'medium' where noise_level = 'high';
update public.spot_reports set self_noise  = 'medium' where self_noise  = 'high';
update public."StudySpot"  set noise_level = 'medium' where noise_level = 'high';

-- 2) Coercion triggers (legacy clients keep working; stored data is always Quiet or Social).
create or replace function public.noise_quiet_social() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name in ('ReportSpotStatus', 'SpotSubmission') then
    if new.noise_level > 2 then new.noise_level := 2; end if;
  else
    if new.noise_level = 'high' then new.noise_level := 'medium'; end if;
    if new.self_noise  = 'high' then new.self_noise  := 'medium'; end if;
  end if;
  return new;
end $$;

drop trigger if exists noise_quiet_social_trg on public."ReportSpotStatus";
create trigger noise_quiet_social_trg before insert or update on public."ReportSpotStatus"
  for each row execute function public.noise_quiet_social();
drop trigger if exists noise_quiet_social_trg on public."SpotSubmission";
create trigger noise_quiet_social_trg before insert or update on public."SpotSubmission"
  for each row execute function public.noise_quiet_social();
drop trigger if exists noise_quiet_social_trg on public.spot_reports;
create trigger noise_quiet_social_trg before insert or update on public.spot_reports
  for each row execute function public.noise_quiet_social();

-- 3) Constraints. Added next to the existing 1-3 / low-medium-high checks, so nothing is dropped.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ReportSpotStatus_noise_quiet_social') then
    alter table public."ReportSpotStatus" add constraint "ReportSpotStatus_noise_quiet_social" check (noise_level in (1, 2));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'SpotSubmission_noise_quiet_social') then
    alter table public."SpotSubmission" add constraint "SpotSubmission_noise_quiet_social" check (noise_level in (1, 2));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spot_reports_noise_quiet_social') then
    alter table public.spot_reports add constraint spot_reports_noise_quiet_social
      check ((noise_level is null or noise_level in ('low', 'medium')) and (self_noise is null or self_noise in ('low', 'medium')));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'StudySpot_noise_quiet_social') then
    alter table public."StudySpot" add constraint "StudySpot_noise_quiet_social" check (noise_level is null or noise_level in ('low', 'medium'));
  end if;
end $$;

-- 4) The "all details required" rule for pinned spots now accepts only Quiet or Social.
alter table public."StudySpot" drop constraint if exists "StudySpot_plan_pin_complete";
alter table public."StudySpot" add constraint "StudySpot_plan_pin_complete"
  check (
    plan_key is null or coalesce(
      building_id is not null and floor_id is not null
      and btrim(coalesce(spot_location, '')) <> ''
      and spot_type_id is not null
      and capacity between 1 and 8
      and group_type in ('solo', 'group')
      and outlets is not null and reservable is not null
      and is_private is not null
      and noise_level in ('low', 'medium'),
      false)
  );

-- ===================== 3. 20261111_009_protected_accounts.sql =====================
-- DEV PAGE. Protected accounts cannot be deleted (the grading account is one).
-- An account is protected when its app_metadata has "protected": true. The database refuses the delete no matter
-- where it comes from (the dev portal, the Supabase dashboard, the API). To delete one on purpose, first clear the flag:
--   update auth.users set raw_app_meta_data = raw_app_meta_data - 'protected' where email = '...';
create or replace function public.protect_accounts() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(old.raw_app_meta_data ->> 'protected', '') = 'true' then
    raise exception 'This account is protected and cannot be deleted.' using errcode = 'P0001';
  end if;
  return old;
end $$;

drop trigger if exists protect_accounts_trg on auth.users;
create trigger protect_accounts_trg before delete on auth.users
  for each row execute function public.protect_accounts();

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"protected":true}'::jsonb
where lower(email) = 'test.user@testing.com';

commit;

-- Optional check afterwards (should show: building_1 = 0, protected test user = true, no noise values above 2):
-- select (select count(*) from public."Buildings" where building_id = 1) building_1,
--        (select raw_app_meta_data->>'protected' from auth.users where lower(email)='test.user@testing.com') test_user_protected,
--        (select max(noise_level) from public."ReportSpotStatus") max_report_noise;
