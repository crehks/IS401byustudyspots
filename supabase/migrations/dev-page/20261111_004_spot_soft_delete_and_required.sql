-- DEV PAGE (test branch). NOT applied to the live project.
-- Soft delete for study spots, and "all details required" for any spot placed on a floor plan.

alter table public."StudySpot" add column if not exists deleted_at timestamptz;
alter table public."StudySpot" add column if not exists noise_level text;
alter table public."StudySpot" add column if not exists is_private boolean;

-- coalesce(..., false): a CHECK passes when its result is NULL, so a missing value must be turned into a failure.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'StudySpot_plan_pin_complete') then
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
          and noise_level in ('low', 'medium', 'high'),
          false)
      );
  end if;
end $$;

create index if not exists studyspot_active_idx on public."StudySpot" (building_id) where deleted_at is null;
