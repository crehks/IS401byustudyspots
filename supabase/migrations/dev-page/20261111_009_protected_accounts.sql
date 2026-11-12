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
