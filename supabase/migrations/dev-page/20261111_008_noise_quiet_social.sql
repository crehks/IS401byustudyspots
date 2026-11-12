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
