-- DEV PORTAL: all migrations in one all-or-nothing script for the Supabase SQL editor.
-- Source of truth: supabase/migrations/dev-page/*.sql (tested on local PGlite). Reverse with supabase/rollback/dev-page-rollback.sql.
-- Safe to re-run: every statement is idempotent. If anything fails, the whole transaction rolls back.
begin;

-- ===================== 20261111_001_admin_gate.sql =====================
-- DEV PAGE. Tested on local PGlite first (tests/admin-gate.test.mjs, tests/pinned-spots.test.mjs), then applied to the live project on 2026-11-11.
--
-- Admin gate: an admin (app_metadata.role = 'admin') must also enter a personal code, which opens a
-- time-limited database session. RLS on every maintained table checks that session.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code_hash text not null,
  failed int not null default 0,
  locked_until timestamptz
);
create table if not exists public.admin_sessions (
  user_id uuid primary key references auth.users on delete cascade,
  expires_at timestamptz not null
);
-- RLS on with zero policies: clients can never read or write these directly.
alter table public.admin_codes enable row level security;
alter table public.admin_sessions enable row level security;

create or replace function public.is_admin_unlocked() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    and exists (select 1 from public.admin_sessions
                where user_id = auth.uid() and expires_at > now());
$$;

create or replace function public.unlock_admin(code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r public.admin_codes;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    return false;
  end if;
  select * into r from public.admin_codes where user_id = auth.uid() for update;
  if not found then
    return false;
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return false;
  end if;
  if r.code_hash = extensions.crypt(code, r.code_hash) then
    update public.admin_codes set failed = 0, locked_until = null where user_id = r.user_id;
    insert into public.admin_sessions (user_id, expires_at)
      values (r.user_id, now() + interval '2 hours')
      on conflict (user_id) do update set expires_at = excluded.expires_at;
    return true;
  end if;
  update public.admin_codes set
    failed = case when failed + 1 >= 5 then 0 else failed + 1 end,
    locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' else locked_until end
  where user_id = r.user_id;
  return false;
end $$;

create or replace function public.lock_admin() returns void
language sql security definer set search_path = '' as $$
  delete from public.admin_sessions where user_id = auth.uid();
$$;

revoke execute on function public.unlock_admin(text), public.is_admin_unlocked(), public.lock_admin()
  from public, anon;
grant execute on function public.unlock_admin(text), public.is_admin_unlocked(), public.lock_admin()
  to authenticated;

-- Admin write/read policy per maintained table. Existing public policies are left untouched.
do $$
declare t text;
begin
  foreach t in array array['Buildings','Floors','SpotType','StudySpot','Resources','ResourceType','BuildingHours']
  loop
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format(
      'create policy "admin all" on public.%I for all to authenticated using (public.is_admin_unlocked()) with check (public.is_admin_unlocked())',
      t);
  end loop;
end $$;

-- Setting a code is manual, done by a project owner in the SQL editor. Never commit real codes:
--   insert into public.admin_codes (user_id, code_hash)
--   values ('<auth user uuid>', extensions.crypt('<code>', extensions.gen_salt('bf')))
--   on conflict (user_id) do update set code_hash = excluded.code_hash, failed = 0, locked_until = null;

-- ===================== 20261111_002_coordinates.sql =====================
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

-- ===================== 20261111_003_floor_plan_pins.sql =====================
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

-- ===================== 20261111_004_spot_soft_delete_and_required.sql =====================
-- DEV PAGE. Tested on local PGlite first, then applied to the live project on 2026-11-11.
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

-- ===================== 20261111_005_resource_pins_and_floor_lock.sql =====================
-- DEV PAGE. Tested on local PGlite first, then applied to the live project on 2026-11-11.
-- 1) Floor-plan pins and soft delete for Resources (same model as study spots).
-- 2) Floors are locked: nobody going through the API (admins, TAs, testers) can delete or re-key a floor.

alter table public."Resources" add column if not exists deleted_at timestamptz;
alter table public."Resources" add column if not exists plan_key text;
alter table public."Resources" add column if not exists plan_x double precision;
alter table public."Resources" add column if not exists plan_y double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'Resources_plan_pin_valid') then
    alter table public."Resources" add constraint "Resources_plan_pin_valid"
      check (
        (plan_x is null) = (plan_y is null)
        and (plan_x is null) = (plan_key is null)
        and (plan_x is null or (plan_x between 0 and 100 and plan_y between 0 and 100))
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'Resources_plan_pin_complete') then
    alter table public."Resources" add constraint "Resources_plan_pin_complete"
      check (
        plan_key is null or (
          building_id is not null and floor_id is not null
          and resource_type_id is not null
          and btrim(coalesce(resource_info, '')) <> ''
          and btrim(coalesce(resource_location, '')) <> ''
        )
      );
  end if;
end $$;

-- The main site reads pinned resources with the public key. Only live, pinned rows are visible.
drop policy if exists "public read pinned resources" on public."Resources";
create policy "public read pinned resources" on public."Resources"
  for select to anon, authenticated using (deleted_at is null and plan_key is not null);
drop policy if exists "public read resource types" on public."ResourceType";
create policy "public read resource types" on public."ResourceType"
  for select to anon, authenticated using (true);

create index if not exists resources_active_idx on public."Resources" (building_id) where deleted_at is null;

-- Floor lock. Only someone with direct database access (the project owner, in the SQL editor) can lift it:
--   begin; set local nook.allow_floor_change = 'on'; delete from public."Floors" where floor_id = ...; commit;
-- Adding new floors stays allowed (the plan editor creates a floor the first time a pin lands on it).
create or replace function public.protect_floors() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('nook.allow_floor_change', true), '') = 'on' then
    return case tg_op when 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Floors are locked and cannot be deleted.' using errcode = 'P0001';
  end if;
  if new.building_id is distinct from old.building_id or new.floor_number is distinct from old.floor_number then
    raise exception 'Floors are locked and cannot be changed.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists protect_floors_trg on public."Floors";
create trigger protect_floors_trg before update or delete on public."Floors"
  for each row execute function public.protect_floors();

-- ===================== 20261111_006_live_grants_and_reports.sql =====================
-- DEV PAGE. Privileges and report rules the dev portal needs on the real project.
-- Additive for the live main site: it only reads Buildings, BuildingHours and StudySpot, and the 25 sample spots keep reporting as before.
-- Reverse with supabase/rollback/dev-page-rollback.sql.

-- 1) The API role "authenticated" had only SELECT on Buildings/StudySpot and nothing on Floors/SpotType.
--    A row-level policy cannot grant what the table privileges forbid, so grant the admin CRUD rights.
--    Row-level security ("admin all" + is_admin_unlocked()) still decides who can use them.
grant select, insert, update, delete on public."Buildings", public."StudySpot", public."SpotType" to authenticated;
-- Floors are locked: create and read only. UPDATE/DELETE stay impossible even if a policy allowed them.
grant select, insert on public."Floors" to authenticated;

-- 2) Hardening: these three tables also gave anon INSERT/UPDATE/DELETE/TRUNCATE (blocked only by RLS).
--    The main site only reads them. TRUNCATE ignores RLS, so remove it for every API role.
revoke insert, update, delete, truncate, references, trigger on public."Resources", public."ResourceType", public."BuildingHours" from anon;
revoke truncate, references, trigger on public."Resources", public."ResourceType", public."BuildingHours" from authenticated;

-- 3) Reports on newly pinned spots. The old rules only allowed spot ids 1001-1025, so new pins could not be reported.
--    Same policy names; the 1001-1025 behaviour is unchanged, live pinned spots are added.
drop policy if exists studybyu_read_reports on public."ReportSpotStatus";
create policy studybyu_read_reports on public."ReportSpotStatus"
  for select to anon, authenticated
  using (
    (spot_id >= 1001 and spot_id <= 1025)
    or exists (select 1 from public."StudySpot" s
               where s.spot_id = "ReportSpotStatus".spot_id and s.plan_key is not null and s.deleted_at is null)
  );

drop policy if exists studybyu_submit_report_guest on public."ReportSpotStatus";
create policy studybyu_submit_report_guest on public."ReportSpotStatus"
  for insert to anon
  with check (
    user_id = 1001
    and exists (select 1 from public."StudySpot" s
                where s.spot_id = "ReportSpotStatus".spot_id and s.reservable = false
                  and ((s.spot_id >= 1001 and s.spot_id <= 1025) or (s.plan_key is not null and s.deleted_at is null)))
  );

drop policy if exists studybyu_submit_report_user on public."ReportSpotStatus";
create policy studybyu_submit_report_user on public."ReportSpotStatus"
  for insert to authenticated
  with check (
    (user_id = 1001
     or user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())))
    and exists (select 1 from public."StudySpot" s
                where s.spot_id = "ReportSpotStatus".spot_id and s.reservable = false
                  and ((s.spot_id >= 1001 and s.spot_id <= 1025) or (s.plan_key is not null and s.deleted_at is null)))
  );

-- ===================== 20261111_007_report_view.sql =====================
-- DEV PAGE. The main site reads each spot's latest report through this view, and the live definition
-- hard-codes spot ids 1001-1025, so a report on a newly pinned spot would save but never be shown.
-- Same columns and ordering; the 1001-1025 rows are unchanged, live pinned spots are added.
-- security_invoker stays on, so the caller's row-level rules on ReportSpotStatus still apply.
create or replace view public.latest_report_spot_status with (security_invoker = true) as
  select distinct on (r.spot_id)
    r.report_id, r.created_at, r.spot_id, r.user_id, r.noise_level, r.crowd_level, r.notes
  from public."ReportSpotStatus" r
  where (r.spot_id >= 1001 and r.spot_id <= 1025)
     or exists (select 1 from public."StudySpot" s
                where s.spot_id = r.spot_id and s.plan_key is not null and s.deleted_at is null)
  order by r.spot_id, r.created_at desc, r.report_id desc;

-- ===================== 20261111_008_noise_quiet_social.sql =====================
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

-- ===================== 20261111_009_protected_accounts.sql =====================
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

commit;
