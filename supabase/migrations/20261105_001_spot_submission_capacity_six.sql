begin;

alter table public."SpotSubmission"
  drop constraint if exists spotsubmission_capacity_check;

alter table public."SpotSubmission"
  add constraint spotsubmission_capacity_check
  check (capacity between 1 and 6) not valid;

commit;
