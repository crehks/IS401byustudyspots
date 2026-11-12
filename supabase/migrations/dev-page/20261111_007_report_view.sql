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
