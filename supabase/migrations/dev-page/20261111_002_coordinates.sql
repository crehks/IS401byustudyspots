-- DEV PAGE. Tested on local PGlite first, then applied to the live project on 2026-11-11.
-- Map pins: plain lat/lng on buildings and spots, constrained to a BYU/Provo bounding box.

alter table public."Buildings" add column if not exists lat double precision;
alter table public."Buildings" add column if not exists lng double precision;
alter table public."StudySpot" add column if not exists lat double precision;
alter table public."StudySpot" add column if not exists lng double precision;

do $$
declare t text;
begin
  foreach t in array array['Buildings','StudySpot']
  loop
    if not exists (select 1 from pg_constraint where conname = t || '_coords_in_provo') then
      execute format(
        'alter table public.%I add constraint %I check ((lat is null) = (lng is null) and (lat is null or (lat between 40.240 and 40.262 and lng between -111.665 and -111.635)))',
        t, t || '_coords_in_provo');
    end if;
  end loop;
end $$;
