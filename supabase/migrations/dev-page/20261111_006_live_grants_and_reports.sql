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
