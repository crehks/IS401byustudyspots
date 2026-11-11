-- DEV PAGE. Tested on local PGlite first, then applied to the live project on 2026-11-11.
-- Floor-plan pins: which digitized plan sheet a study spot sits on, and where (percent of the drawing).

alter table public."StudySpot" add column if not exists plan_key text;
alter table public."StudySpot" add column if not exists plan_x double precision;
alter table public."StudySpot" add column if not exists plan_y double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'StudySpot_plan_pin_valid') then
    alter table public."StudySpot" add constraint "StudySpot_plan_pin_valid"
      check (
        (plan_x is null) = (plan_y is null)
        and (plan_x is null) = (plan_key is null)
        and (plan_x is null or (plan_x between 0 and 100 and plan_y between 0 and 100))
      );
  end if;
end $$;
