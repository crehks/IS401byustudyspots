-- Login / sign-up slice: Supabase Auth (auth.users) linked to the team's public."User" table.
-- Existing User rows (demo user 1001 etc.) are preserved; auth_id stays NULL for them.

alter table public."User" add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;

-- Every new auth account gets a matching "User" row (first/last name come from sign-up metadata).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public."User" (auth_id, first_name, last_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), split_part(new.email, '@', 1)), 60),
    left(coalesce(trim(new.raw_user_meta_data->>'last_name'), ''), 60)
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Users can read only their own row; nobody can write "User" from the browser.
revoke all on public."User" from anon, authenticated;
grant select on public."User" to authenticated;
drop policy if exists studybyu_read_own_user on public."User";
create policy studybyu_read_own_user on public."User" for select to authenticated
  using (auth_id = (select auth.uid()));

-- Reports and spot submissions: guests (anon) keep posting as demo user 1001; signed-in users post as
-- themselves. Separate policies per role, because anon has no access to "User" for the lookup.
drop policy if exists studybyu_submit_report on public."ReportSpotStatus";
drop policy if exists studybyu_submit_report_guest on public."ReportSpotStatus";
drop policy if exists studybyu_submit_report_user on public."ReportSpotStatus";
create policy studybyu_submit_report_guest on public."ReportSpotStatus" for insert to anon
  with check (
    user_id = 1001 and spot_id between 1001 and 1025
    and exists (select 1 from public."Study Spot" s where s.spot_id = "ReportSpotStatus".spot_id and s.reservable = false)
  );
create policy studybyu_submit_report_user on public."ReportSpotStatus" for insert to authenticated
  with check (
    (user_id = 1001 or user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())))
    and spot_id between 1001 and 1025
    and exists (select 1 from public."Study Spot" s where s.spot_id = "ReportSpotStatus".spot_id and s.reservable = false)
  );

drop policy if exists studybyu_submit_spot on public."SpotSubmission";
drop policy if exists studybyu_submit_spot_guest on public."SpotSubmission";
drop policy if exists studybyu_submit_spot_user on public."SpotSubmission";
create policy studybyu_submit_spot_guest on public."SpotSubmission" for insert to anon
  with check (
    user_id = 1001 and status = 'pending' and approved_spot_id is null
    and building_id in (1001,1002,1003) and spot_type_id in (1001,1002,1003)
  );
create policy studybyu_submit_spot_user on public."SpotSubmission" for insert to authenticated
  with check (
    (user_id = 1001 or user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())))
    and status = 'pending' and approved_spot_id is null
    and building_id in (1001,1002,1003) and spot_type_id in (1001,1002,1003)
  );

-- Favorites groundwork: lists belong to a signed-in user; items belong to a list the user owns.
revoke all on public."Favorites List", public."Favorites", public."Study Spots/Favorites" from anon;
revoke truncate, references, trigger on public."Favorites List", public."Favorites", public."Study Spots/Favorites" from authenticated;
drop policy if exists favlist_own on public."Favorites List";
create policy favlist_own on public."Favorites List" for all to authenticated
  using (user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())))
  with check (user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())));

drop policy if exists fav_own on public."Favorites";
create policy fav_own on public."Favorites" for all to authenticated
  using ("list_ID" in (select l."list_ID" from public."Favorites List" l))
  with check ("list_ID" in (select l."list_ID" from public."Favorites List" l));

-- Seed rows used explicit IDs (1001+), leaving the identity counter behind; resync so new sign-ups get fresh IDs.
select setval(pg_get_serial_sequence('public."User"','user_id'), greatest((select max(user_id) from public."User"), 1100));

-- Only signed-in users may set user_id on insert (anon keeps the demo-user default).
grant insert (user_id) on public."ReportSpotStatus" to authenticated;
grant insert (user_id) on public."SpotSubmission" to authenticated;

-- Junction table: an item is visible/editable only when its Favorites row belongs to one of the user's lists.
drop policy if exists favlink_own on public."Study Spots/Favorites";
create policy favlink_own on public."Study Spots/Favorites" for all to authenticated
  using (fave_id in (select f.fave_id from public."Favorites" f))
  with check (fave_id in (select f.fave_id from public."Favorites" f));
