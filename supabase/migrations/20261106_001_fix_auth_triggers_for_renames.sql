-- The tables "Favorites List" and "Study Spot" were renamed to "FavoritesList" and "StudySpot" after
-- 20261105_002. Policies and constraints followed the rename automatically, but plpgsql function bodies
-- keep table names as text, so the two trigger functions still pointed at the old name and every sign-up
-- failed with "Database error saving new user". This re-creates them against the current names.
create or replace function public.limit_favorites_lists()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public."FavoritesList" where user_id = new.user_id) >= 3 then
    raise exception 'You can have Favorites and two custom lists.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare new_user_id bigint;
begin
  insert into public."User" (auth_id, first_name, last_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), split_part(new.email, '@', 1)), 60),
    left(coalesce(trim(new.raw_user_meta_data->>'last_name'), ''), 60)
  )
  on conflict (auth_id) do nothing
  returning user_id into new_user_id;
  if new_user_id is not null then
    insert into public."FavoritesList" (user_id, list_name) values (new_user_id, 'Favorites');
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
