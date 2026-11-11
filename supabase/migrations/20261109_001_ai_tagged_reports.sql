-- Additive: AI-tagged crowd/noise reports. Does not touch "ReportSpotStatus".

create type public.report_level  as enum ('low', 'medium', 'high');
create type public.report_status as enum ('pending', 'approved', 'rejected');

create table public.spot_reports (
  id          bigint generated always as identity primary key,
  space_id    bigint not null references public."StudySpot"(spot_id) on delete cascade,
  user_id     uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  body        text   not null check (char_length(btrim(body)) between 1 and 240),
  self_noise  public.report_level,
  self_crowd  public.report_level,
  noise_level public.report_level,
  crowd_level public.report_level,
  status      public.report_status not null default 'pending',
  ai_reason   text check (char_length(ai_reason) <= 500),
  attempts    smallint not null default 0,
  created_at  timestamptz not null default now(),
  tagged_at   timestamptz,
  -- approved rows must be fully tagged; rejected/pending rows carry no tags
  constraint spot_reports_tags_match_status check (
    (status = 'approved' and noise_level is not null and crowd_level is not null)
    or (status <> 'approved' and noise_level is null and crowd_level is null)
  )
);

create index spot_reports_recent_idx  on public.spot_reports (space_id, created_at desc) where status = 'approved';
create index spot_reports_pending_idx on public.spot_reports (created_at) where status = 'pending';
create index spot_reports_rate_idx    on public.spot_reports (user_id, space_id, created_at desc);

alter table public.spot_reports enable row level security;

-- Column-level grants: clients can only supply these four columns.
revoke all on public.spot_reports from anon, authenticated;
grant insert (space_id, body, self_noise, self_crowd) on public.spot_reports to authenticated;
grant select on public.spot_reports to authenticated;

create policy spot_reports_insert_own on public.spot_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy spot_reports_read on public.spot_reports
  for select to authenticated
  using (status = 'approved' or user_id = (select auth.uid()));

-- No UPDATE/DELETE policy or grant for clients; service_role bypasses RLS.

-- Rate limit: max 3 reports per user per space per hour.
create function public.spot_reports_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.spot_reports
        where user_id = new.user_id and space_id = new.space_id
          and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Report limit reached for this space. Try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger spot_reports_rate_limit_trg
  before insert on public.spot_reports
  for each row execute function public.spot_reports_rate_limit();

-- Current conditions per space: linearly time-decayed weighted average of approved
-- reports inside the window, rounded to a level. NULL = no recent data.
create function public.space_conditions(p_window_minutes int default 45)
returns table (
  space_id bigint,
  noise_level public.report_level,
  crowd_level public.report_level,
  report_count int,
  last_report_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with w as (
    select r.space_id, r.created_at,
           greatest(0.05, 1 - extract(epoch from (now() - r.created_at)) / (p_window_minutes * 60.0)) as wt,
           case r.noise_level when 'low' then 1 when 'medium' then 2 when 'high' then 3 end as n,
           case r.crowd_level when 'low' then 1 when 'medium' then 2 when 'high' then 3 end as c
    from public.spot_reports r
    where r.status = 'approved'
      and r.created_at > now() - make_interval(mins => p_window_minutes)
  ), a as (
    select space_id,
           sum(wt * n) / sum(wt) as n,
           sum(wt * c) / sum(wt) as c,
           count(*)::int as cnt,
           max(created_at) as last_at
    from w group by space_id
  )
  select s.spot_id,
         (array['low','medium','high']::public.report_level[])[round(a.n)::int],
         (array['low','medium','high']::public.report_level[])[round(a.c)::int],
         coalesce(a.cnt, 0),
         a.last_at
  from public."StudySpot" s
  left join a on a.space_id = s.spot_id;
$$;

revoke all on function public.space_conditions(int) from public;
grant execute on function public.space_conditions(int) to anon, authenticated;
