-- Run after the report-slice migration. All names, locations, hours, and reports
-- are fictional/illustrative classroom samples, NOT verified campus operations.
-- Stable keys and DO NOTHING make repeats safe without resetting new reports.
begin;

insert into public.buildings (building_id, location, building_opens, building_closes) values
  ('HBLL', 'Sample: Harold B. Lee Library, BYU campus', '07:00', '23:00'),
  ('WSC', 'Sample: Wilkinson Student Center, BYU campus', '07:00', '22:00'),
  ('JKB', 'Sample: Jesse Knight Building, BYU campus', '08:00', '21:00')
on conflict do nothing;

-- East/West are drawing views of the SAME physical WSC floor.
insert into public.floors (floor_id, building_id, floor_number) values
  ('HBLL-L2', 'HBLL', 2), ('HBLL-L3', 'HBLL', 3), ('HBLL-L4', 'HBLL', 4),
  ('WSC-1', 'WSC', 1), ('WSC-2', 'WSC', 2), ('WSC-3', 'WSC', 3),
  ('WSC-4', 'WSC', 4), ('WSC-5', 'WSC', 5), ('WSC-6', 'WSC', 6),
  ('JKB-G', 'JKB', 0), ('JKB-L2', 'JKB', 2)
on conflict do nothing;

insert into public.spot_types (type_id, description) values
  ('solo', 'Individual study in an open area'),
  ('group', 'Group study for two to eight people'),
  ('solo-private', 'Individual study in a separated space')
on conflict do nothing;

-- IDs match every built-in frontend study spot, including all WSC floor views.
insert into public.study_spots (spot_id, spot_type_id, building_id, floor_id, spot_name, outlets, capacity, location, reservable, seat_type) values
  ('hbll-commons','solo','HBLL','HBLL-L3','Entry level open tables',true,1,'Sample: entry level open area',false,'table'),
  ('hbll-west','solo','HBLL','HBLL-L3','West study corner',true,1,'Sample: west study corner',false,'table'),
  ('hbll-group','group','HBLL','HBLL-L3','Group study room',true,6,'Sample: entry level room',true,'table'),
  ('hbll-think','group','HBLL','HBLL-L2','Think Tank area',true,6,'Sample: level 2 group area',false,'table'),
  ('hbll-reading','solo','HBLL','HBLL-L2','Reading Room area',false,1,'Sample: level 2 reading area',false,'chair'),
  ('hbll-single','solo-private','HBLL','HBLL-L2','Single-user study room',true,1,'Sample: level 2 room',true,'desk'),
  ('hbll-upper','solo','HBLL','HBLL-L4','Upper level tables',true,1,'Sample: level 4 open area',false,'table'),
  ('wsc-tables','group','WSC','WSC-1','East hall tables (sample)',true,4,'Sample: floor 1 East view',false,'table'),
  ('wsc-lounge','solo','WSC','WSC-1','East open seating (sample)',false,1,'Sample: floor 1 East view',false,'chair'),
  ('wsc-1w-atrium','group','WSC','WSC-1','West atrium seating (sample)',false,6,'Sample: floor 1 West view',false,'chair'),
  ('wsc-1w-nook','solo','WSC','WSC-1','West side nook (sample)',true,1,'Sample: floor 1 West view',false,'chair'),
  ('wsc-upper','group','WSC','WSC-2','Second-floor tables (sample)',true,6,'Sample: floor 2 East view',false,'table'),
  ('wsc-2e-seating','solo','WSC','WSC-2','East seating area (sample)',false,1,'Sample: floor 2 East view',false,'chair'),
  ('wsc-2w-open','group','WSC','WSC-2','West open area (sample)',true,6,'Sample: floor 2 West view',false,'table'),
  ('wsc-2w-corner','solo','WSC','WSC-2','Southwest corner (sample)',false,1,'Sample: floor 2 West view',false,'chair'),
  ('wsc-3e-hall','group','WSC','WSC-3','Third-floor hall (sample)',true,4,'Sample: floor 3 East view',false,'table'),
  ('wsc-3e-corner','solo','WSC','WSC-3','East quiet corner (sample)',false,1,'Sample: floor 3 East view',false,'chair'),
  ('wsc-3w-open','group','WSC','WSC-3','West open area (sample)',true,8,'Sample: floor 3 West view',false,'table'),
  ('wsc-3w-south','solo','WSC','WSC-3','West corridor nook (sample)',false,1,'Sample: floor 3 West view',false,'chair'),
  ('wsc-4f','solo','WSC','WSC-4','Fourth-floor alcove (sample)',false,1,'Sample: floor 4 view',false,'chair'),
  ('wsc-5f','solo','WSC','WSC-5','Fifth-floor seating (sample)',true,1,'Sample: floor 5 view',false,'chair'),
  ('wsc-6f','group','WSC','WSC-6','Sixth-floor open area (sample)',false,4,'Sample: floor 6 view',false,'table'),
  ('jkb-tables','solo','JKB','JKB-G','Ground level tables',true,1,'Sample: ground floor open area',false,'table'),
  ('jkb-nook','solo-private','JKB','JKB-G','Quiet study nook',false,1,'Sample: ground floor nook',false,'chair'),
  ('jkb-group','group','JKB','JKB-L2','Group table area',true,8,'Sample: level 2 group area',false,'table')
on conflict do nothing;

insert into public.users (user_id, first_name, last_name) values
  ('00000000-0000-4000-8000-000000000001','Demo','Student'),
  ('00000000-0000-4000-8000-000000000002','Sample','Student'),
  ('00000000-0000-4000-8000-000000000003','Example','Student')
on conflict do nothing;

insert into public.user_reports (report_id, spot_id, user_id, noise_level, crowd_levels, notes, time_reported) values
  ('10000000-0000-4000-8000-000000000001','hbll-west','00000000-0000-4000-8000-000000000001','low','low','Sample report: quiet tables.','2026-01-01T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000002','wsc-tables','00000000-0000-4000-8000-000000000002','medium','low','Sample report: available seats.','2026-01-01T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000003','jkb-tables','00000000-0000-4000-8000-000000000003','low','medium','Sample report: several seats occupied.','2026-01-01T12:00:00Z')
on conflict do nothing;

commit;
