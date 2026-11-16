-- OKR tracking. Additive and idempotent. Real activity only: nothing here inserts rows.
-- Feeds the admin-only Impact dashboard (okr.html) through one aggregate function; the browser never reads raw events.
-- Needs the admin gate (supabase/migrations/dev-page/20261111_001_admin_gate.sql), which is already live.
--   O1-KR1  was_available on spot_reports / "ReportSpotStatus"   (arrival report answer)
--   O1-KR2  spot_choice_events.seconds                           (time from page load to "Choose this spot")
--   O2-KR1  user_visits                                          (sign-ins and returns, written by record_visit())
--   O2-KR2  spot_reports                                         (existing table)
-- Reverse: drop function public.okr_metrics(); drop function public.record_visit(boolean);
--          drop table public.user_visits, public.spot_choice_events; alter table ... drop column was_available.

-- 1) Arrival answer. Policies do not name columns, so only the column-level insert grants need extending.
alter table public.spot_reports add column if not exists was_available boolean;
alter table public."ReportSpotStatus" add column if not exists was_available boolean;
grant insert (was_available) on public.spot_reports to authenticated;
grant insert (was_available) on public."ReportSpotStatus" to anon, authenticated;

-- 2) Time-to-choose events. Anonymous on purpose: no user id, insert-only, nothing readable from the browser.
create table if not exists public.spot_choice_events (
  event_id   bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  seconds    integer not null check (seconds between 1 and 3600)
);
alter table public.spot_choice_events enable row level security;
revoke all on public.spot_choice_events from anon, authenticated;
grant insert (seconds) on public.spot_choice_events to anon, authenticated;
drop policy if exists okr_choice_insert on public.spot_choice_events;
create policy okr_choice_insert on public.spot_choice_events for insert to anon, authenticated with check (true);

-- 3) Visits by registered users. A visit is a fresh sign-in, or an app open by someone who stayed logged in and
--    was away 30+ minutes. Counting returns as well as sign-ins matters because sessions persist: a student who
--    uses the app daily may never sign in twice. No browser access to the table; only record_visit() writes it.
create table if not exists public.user_visits (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references public."User"(user_id) on delete cascade,
  visited_at timestamptz not null default now()
);
create index if not exists user_visits_user_time_idx on public.user_visits (user_id, visited_at);
alter table public.user_visits enable row level security;
revoke all on public.user_visits from anon, authenticated;

-- Called by the app after a sign-in (p_sign_in = true) or when it opens with a saved session (false).
-- The caller can only record a visit for themselves. Repeats inside the gap are ignored, so a page refresh is not a visit.
create or replace function public.record_visit(p_sign_in boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare uid bigint;
begin
  select u.user_id into uid from public."User" u where u.auth_id = auth.uid();
  if uid is null then return; end if;
  if exists (select 1 from public.user_visits v
             where v.user_id = uid
               and v.visited_at > now() - case when p_sign_in then interval '1 minute' else interval '30 minutes' end) then
    return;
  end if;
  insert into public.user_visits (user_id) values (uid);
end $$;
revoke all on function public.record_visit(boolean) from public, anon;
grant execute on function public.record_visit(boolean) to authenticated;

-- 4) Aggregates only, and admin only: the caller must be an admin with an unlocked admin session
--    (public.is_admin_unlocked(), from the dev-page admin gate migration). Everyone else gets a 403.
--    "Registered" = a User row linked to an auth account; guest rows (auth_id null) never count.
create or replace function public.okr_metrics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin_unlocked() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  return (
  with arrival as (
    select was_available from public.spot_reports where was_available is not null
    union all
    select was_available from public."ReportSpotStatus" where was_available is not null
  ),
  a as (select count(*) filter (where was_available) as available, count(*) as answered from arrival),
  c as (select count(*) as n, avg(seconds) as avg_seconds from public.spot_choice_events),
  reg as (select count(*) as n from public."User" where auth_id is not null),
  s as (
    select count(*) as n from (
      select v.user_id from public.user_visits v
      join public."User" u on u.user_id = v.user_id and u.auth_id is not null
      where v.visited_at >= now() - interval '14 days'
      group by v.user_id having count(*) >= 2
    ) x
  ),
  r as (
    select count(*) as n from (
      select u.user_id from public.spot_reports p
      join public."User" u on u.auth_id = p.user_id
      where p.created_at >= now() - interval '14 days'
      group by u.user_id having count(*) >= 2
    ) x
  )
  select jsonb_build_object(
    'o1k1', jsonb_build_object('available', a.available, 'answered', a.answered,
      'pct', coalesce(round(100.0 * a.available / nullif(a.answered, 0), 1), 0)),
    'o1k2', jsonb_build_object('avg_seconds', round(c.avg_seconds, 1), 'n', c.n,
      'progress_pct', case when c.avg_seconds is null then 0
        else round(greatest(0, least(100, (180 - c.avg_seconds) / 120 * 100)), 1) end),
    'o2k1', jsonb_build_object('users', s.n, 'registered', reg.n,
      'pct', coalesce(round(100.0 * s.n / nullif(reg.n, 0), 1), 0)),
    'o2k2', jsonb_build_object('users', r.n, 'registered', reg.n,
      'pct', coalesce(round(100.0 * r.n / nullif(reg.n, 0), 1), 0)),
    'generated_at', now()
  )
  from a, c, reg, s, r
  );
end $$;
revoke all on function public.okr_metrics() from public, anon;
grant execute on function public.okr_metrics() to authenticated;
