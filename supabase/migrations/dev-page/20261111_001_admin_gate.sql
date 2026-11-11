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
