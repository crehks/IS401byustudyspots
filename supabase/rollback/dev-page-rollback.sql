-- Reverses every live change made for the dev portal (migrations 001-007). NOT run automatically.
-- WARNING: dropping the pin/soft-delete columns deletes any pins and soft-delete marks made since go-live.
-- Left alone on purpose: the "extensions" schema and pgcrypto (they existed before), tag-report, existing data.
-- Remove the edge function separately (Supabase dashboard > Edge Functions > admin-users > delete).
begin;

-- 007: restore the original report view (sample ids 1001-1025 only).
create or replace view public.latest_report_spot_status with (security_invoker = true) as
  select distinct on (spot_id) report_id, created_at, spot_id, user_id, noise_level, crowd_level, notes
  from "ReportSpotStatus" where spot_id >= 1001 and spot_id <= 1025
  order by spot_id, created_at desc, report_id desc;

-- 006: restore the original report policies (verbatim from the pre-change snapshot).
drop policy if exists studybyu_read_reports on public."ReportSpotStatus";
create policy studybyu_read_reports on public."ReportSpotStatus" for select to anon, authenticated
  using ((spot_id >= 1001) and (spot_id <= 1025));
drop policy if exists studybyu_submit_report_guest on public."ReportSpotStatus";
create policy studybyu_submit_report_guest on public."ReportSpotStatus" for insert to anon
  with check ((user_id = 1001) and ((spot_id >= 1001) and (spot_id <= 1025)) and (exists (
    select 1 from public."StudySpot" s where ((s.spot_id = "ReportSpotStatus".spot_id) and (s.reservable = false)))));
drop policy if exists studybyu_submit_report_user on public."ReportSpotStatus";
create policy studybyu_submit_report_user on public."ReportSpotStatus" for insert to authenticated
  with check (((user_id = 1001) or (user_id in (select u.user_id from public."User" u where (u.auth_id = (select auth.uid() as uid)))))
    and ((spot_id >= 1001) and (spot_id <= 1025)) and (exists (
    select 1 from public."StudySpot" s where ((s.spot_id = "ReportSpotStatus".spot_id) and (s.reservable = false)))));

-- 006: restore the original table privileges.
grant all on public."Resources", public."ResourceType", public."BuildingHours" to anon, authenticated;
revoke insert, update, delete on public."Buildings", public."StudySpot" from authenticated;
revoke all on public."Floors", public."SpotType" from authenticated;

-- 005: floor lock, resource policies, resource columns.
drop trigger if exists protect_floors_trg on public."Floors";
drop function if exists public.protect_floors();
drop policy if exists "public read pinned resources" on public."Resources";
drop policy if exists "public read resource types" on public."ResourceType";
alter table public."Resources" drop column if exists plan_key, drop column if exists plan_x, drop column if exists plan_y, drop column if exists deleted_at;

-- 004/003/002: spot and building columns (their constraints and indexes go with them).
alter table public."StudySpot" drop column if exists noise_level, drop column if exists is_private, drop column if exists deleted_at,
  drop column if exists plan_key, drop column if exists plan_x, drop column if exists plan_y, drop column if exists lat, drop column if exists lng;
alter table public."Buildings" drop column if exists lat, drop column if exists lng;

-- 001: admin gate.
do $$
declare t text;
begin
  foreach t in array array['Buildings','Floors','SpotType','StudySpot','Resources','ResourceType','BuildingHours']
  loop
    execute format('drop policy if exists "admin all" on public.%I', t);
  end loop;
end $$;
drop function if exists public.unlock_admin(text);
drop function if exists public.lock_admin();
drop function if exists public.is_admin_unlocked();
drop table if exists public.admin_sessions;
drop table if exists public.admin_codes;

commit;
