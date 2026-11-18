-- "Report a Spot" page: let a submission carry the pin a student dropped on the floor plan.
-- Same shape as the dev-page pins on StudySpot: which plan sheet (plan_key) and where (percent of the drawing).
-- Purely additive. Existing rows and the old insert path keep working; nothing public is read or approved here,
-- so submissions still wait as 'pending' until the team reviews them.
alter table public."SpotSubmission" add column if not exists plan_key text;
alter table public."SpotSubmission" add column if not exists plan_x double precision;
alter table public."SpotSubmission" add column if not exists plan_y double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'SpotSubmission_plan_pin_valid') then
    alter table public."SpotSubmission" add constraint "SpotSubmission_plan_pin_valid"
      check (
        (plan_x is null) = (plan_y is null)
        and (plan_x is null) = (plan_key is null)
        and (plan_key is null or char_length(plan_key) between 1 and 20)
        and (plan_x is null or (plan_x between 0 and 100 and plan_y between 0 and 100))
      );
  end if;
end $$;

-- Guests and signed-in users can both report, so both may write the new columns.
grant insert (plan_key, plan_x, plan_y) on public."SpotSubmission" to anon, authenticated;
