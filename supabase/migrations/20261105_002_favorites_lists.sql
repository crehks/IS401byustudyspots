-- Cloud favorites: saved lists belong to an account and follow it across devices.
-- Uses the team's existing "Favorites List" (one row per list) and "Favorites" (one row per saved spot).
-- "Study Spots/Favorites" is a redundant junction table and is intentionally left unused.

-- A saved spot must exist, and may appear only once per list.
alter table public."Favorites" alter column "spot_ID" set not null;
alter table public."Favorites" alter column "list_ID" set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'favorites_spot_fk') then
    alter table public."Favorites" add constraint favorites_spot_fk foreign key ("spot_ID") references public."Study Spot"(spot_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'favorites_list_spot_uniq') then
    alter table public."Favorites" add constraint favorites_list_spot_uniq unique ("list_ID", "spot_ID");
  end if;
  if not exists (select 1 from pg_constraint where conname = 'favorites_list_name_len') then
    alter table public."Favorites List" add constraint favorites_list_name_len check (char_length(btrim(list_name)) between 1 and 28);
  end if;
end $$;

-- List names are unique per user (case-insensitive).
create unique index if not exists favorites_list_user_name_uniq on public."Favorites List" (user_id, lower(btrim(list_name)));

-- At most three lists per user: Favorites plus two custom lists (matches the app).
create or replace function public.limit_favorites_lists()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public."Favorites List" where user_id = new.user_id) >= 3 then
    raise exception 'You can have Favorites and two custom lists.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_favorites_lists_trg on public."Favorites List";
create trigger limit_favorites_lists_trg before insert on public."Favorites List"
  for each row execute function public.limit_favorites_lists();

-- Every new account starts with a Favorites list.
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
    insert into public."Favorites List" (user_id, list_name) values (new_user_id, 'Favorites');
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
