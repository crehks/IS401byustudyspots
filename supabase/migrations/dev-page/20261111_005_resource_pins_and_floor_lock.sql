-- DEV PAGE (test branch). NOT applied to the live project.
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
