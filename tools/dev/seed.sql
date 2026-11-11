-- Local-only demo data and demo accounts for the dev page. Fabricated values, never used on any real service.
-- Demo admin:   admin@nook.test  / password DevAdmin#2026  / admin code 314159
-- Demo regular: member@nook.test / password DevMember#2026 (signs in but sees no admin tools)
-- Coordinates below are rough placeholders, not surveyed. Use the map to correct them.

insert into public."SpotType" (type_name) values ('Table'), ('Study room'), ('Carrel'), ('Lounge');

insert into public."Buildings" (building_name, building_location, opening_hrs, closing_hrs, reservation_url, lat, lng) values
  ('Harold B. Lee Library', 'Central campus', '07:00', '23:00', 'https://lib.byu.edu/', 40.2494, -111.6492),
  ('Wilkinson Student Center', 'Central campus', '07:00', '23:00', null, 40.2490, -111.6486),
  ('Joseph Knight Building', 'North campus', '07:00', '22:00', null, 40.2517, -111.6501);

insert into public."Floors" (floor_number, building_id)
  select n, b.building_id from public."Buildings" b, generate_series(1,3) n;


insert into public."ResourceType" (resource_name) values ('Printer'), ('Water fountain'), ('Vending');
insert into public."Resources" (resource_type_id, floor_id, building_id, resource_info, resource_location)
  select 1, f.floor_id, f.building_id, 'Black and white printer', 'Near the stairs'
  from public."Floors" f where f.floor_number = 1;
insert into public."BuildingHours" (building_id, day_of_week, open_time, close_time)
  select building_id, d, '07:00', '22:00' from public."Buildings", generate_series(1,5) d;

insert into auth.users (email, encrypted_password, raw_app_meta_data, email_confirmed_at) values
  ('admin@nook.test', extensions.crypt('DevAdmin#2026', extensions.gen_salt('bf')), '{"role":"admin"}', now()),
  ('member@nook.test', extensions.crypt('DevMember#2026', extensions.gen_salt('bf')), '{}', now());

insert into public."User" (auth_id, first_name, last_name)
  select id, case email when 'admin@nook.test' then 'Dev' else 'Member' end, case email when 'admin@nook.test' then 'Admin' else 'Tester' end from auth.users;

insert into public.admin_codes (user_id, code_hash)
  select id, extensions.crypt('314159', extensions.gen_salt('bf')) from auth.users where email = 'admin@nook.test';
